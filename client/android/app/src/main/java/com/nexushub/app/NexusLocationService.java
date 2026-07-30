package com.nexushub.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Foreground service reportující polohu telefonu na tracker /ingest i se zhasnutou
 * obrazovkou (bezpečnost — telefon jako GPS tracker). Konfiguraci (token, ingest URL,
 * interval) předává NexusRelayPlugin.startLocationTracking a ukládá ji do
 * EncryptedSharedPreferences, takže přežije restart služby (START_STICKY).
 *
 * Reportuje se jen když je aktivní (gating A+B+C řídí JS přes start/stopLocationTracking).
 */
public class NexusLocationService extends Service implements LocationListener {
    static final String ACTION_START = "com.nexushub.app.action.LOCATION_START";
    static final String ACTION_STOP  = "com.nexushub.app.action.LOCATION_STOP";

    static final String KEY_TRACK_ACTIVE = "trackActive";
    static final String KEY_TRACK_TOKEN  = "trackToken";
    static final String KEY_TRACK_URL    = "trackIngestUrl";
    static final String KEY_TRACK_MIN_MS = "trackMinIntervalMs";

    private static final String TAG = "NexusLocationSvc";
    private static final String CHANNEL_ID = "nexus-location-foreground";
    private static final int NOTIFICATION_ID = 10031;
    private static final long DEFAULT_MIN_INTERVAL_MS = 20000L;
    // 0 m = časový heartbeat: bezpečnostní tracker musí hlásit polohu i vestoje
    // (proof-of-life / aktuální poloha), ne jen při pohybu ≥ N metrů.
    private static final float MIN_DISTANCE_M = 0f;

    private LocationManager locationManager;
    private long lastSentAt = 0;
    private long minIntervalMs = DEFAULT_MIN_INTERVAL_MS;
    // Trvalý wakelock po dobu trackingu: bez něj CPU se zhasnutou obrazovkou usne
    // mezi fixy a LocationManager přestane doručovat polohu (background tracking
    // by tiše zamrzl). Držíme ho, dokud sledování běží; foreground notifikace o tom informuje.
    private PowerManager.WakeLock trackingWakeLock;

    static void start(Context context) {
        Intent i = new Intent(context, NexusLocationService.class);
        i.setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(i);
        else context.startService(i);
    }

    static void stop(Context context) {
        Intent i = new Intent(context, NexusLocationService.class);
        i.setAction(ACTION_STOP);
        context.startService(i);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        SharedPreferences prefs = NexusRelayPlugin.securePrefs(this, NexusRelayPlugin.PREFS_NAME);

        if (ACTION_STOP.equals(action) || !prefs.getBoolean(KEY_TRACK_ACTIVE, false)) {
            stopUpdates();
            releaseTrackingWakeLock();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        minIntervalMs = prefs.getLong(KEY_TRACK_MIN_MS, DEFAULT_MIN_INTERVAL_MS);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, buildNotification());
        }
        acquireTrackingWakeLock();
        startUpdates();
        return START_STICKY;
    }

    private boolean hasLocationPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void startUpdates() {
        if (!hasLocationPermission()) {
            Log.w(TAG, "Chybí location permission — službu zastavuji.");
            stopForeground(true);
            stopSelf();
            return;
        }
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, minIntervalMs, MIN_DISTANCE_M, this);
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, minIntervalMs, MIN_DISTANCE_M, this);
            }
        } catch (SecurityException e) {
            Log.w(TAG, "requestLocationUpdates: " + e.getMessage());
        }
    }

    private void stopUpdates() {
        try { if (locationManager != null) locationManager.removeUpdates(this); } catch (Exception ignored) { }
    }

    private void acquireTrackingWakeLock() {
        try {
            if (trackingWakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                trackingWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NexusHub::LocTrackWakeLock");
                trackingWakeLock.setReferenceCounted(false);
            }
            if (!trackingWakeLock.isHeld()) trackingWakeLock.acquire();
        } catch (Exception e) {
            Log.w(TAG, "acquireTrackingWakeLock: " + e.getMessage());
        }
    }

    private void releaseTrackingWakeLock() {
        try {
            if (trackingWakeLock != null && trackingWakeLock.isHeld()) trackingWakeLock.release();
        } catch (Exception ignored) { }
    }

    @Override
    public void onLocationChanged(Location location) {
        long now = System.currentTimeMillis();
        if (now - lastSentAt < minIntervalMs) return; // throttle
        lastSentAt = now;
        postLocation(location);
    }

    @Override public void onProviderEnabled(String provider) { }
    @Override public void onProviderDisabled(String provider) { }
    @Override public void onStatusChanged(String provider, int status, Bundle extras) { }

    private void postLocation(final Location loc) {
        new Thread(() -> {
            SharedPreferences prefs = NexusRelayPlugin.securePrefs(this, NexusRelayPlugin.PREFS_NAME);
            String url = prefs.getString(KEY_TRACK_URL, null);
            String token = prefs.getString(KEY_TRACK_TOKEN, null);
            if (url == null || token == null) return;

            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NexusHub::LocPostWakeLock");
            wakeLock.acquire(15000);
            try {
                StringBuilder body = new StringBuilder();
                body.append("{\"token\":\"").append(token.replace("\"", "")).append("\"");
                body.append(",\"lat\":").append(loc.getLatitude());
                body.append(",\"lng\":").append(loc.getLongitude());
                if (loc.hasAccuracy()) body.append(",\"accuracy\":").append(loc.getAccuracy());
                if (loc.hasSpeed()) body.append(",\"speedKph\":").append(loc.getSpeed() * 3.6f);
                if (loc.hasBearing()) body.append(",\"heading\":").append(loc.getBearing());
                body.append("}");

                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setDoOutput(true);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }
                int code = conn.getResponseCode();
                if (code >= 300) Log.w(TAG, "ingest HTTP " + code);
                else Log.i(TAG, "ingest OK " + code + " @" + loc.getLatitude() + "," + loc.getLongitude());
                conn.disconnect();
            } catch (Exception e) {
                Log.w(TAG, "postLocation: " + e.getMessage());
            } finally {
                if (wakeLock.isHeld()) wakeLock.release();
            }
        }).start();
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Nexus – sdílení polohy")
            .setContentText("Poloha se sdílí kvůli bezpečnosti")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "Sdílení polohy", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Aktivní během schůzky nebo SOS");
        nm.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        stopUpdates();
        releaseTrackingWakeLock();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
