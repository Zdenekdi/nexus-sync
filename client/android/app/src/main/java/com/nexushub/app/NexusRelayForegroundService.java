package com.nexushub.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.telephony.PhoneStateListener;
import android.telephony.SmsManager;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class NexusRelayForegroundService extends Service {
    static final String ACTION_START = "com.nexushub.app.action.RELAY_START";
    static final String ACTION_STOP  = "com.nexushub.app.action.RELAY_STOP";

    private static final String TAG            = "NexusRelayService";
    private static final String CHANNEL_ID     = "nexus-relay-foreground";
    private static final int    NOTIFICATION_ID = 10021;
    private static final int    POLL_INTERVAL_S = 30;   // native outbox poll interval
    private static final int    INITIAL_DELAY_S = 5;    // first poll after 5s

    private TelephonyManager      telephonyManager;
    private NexusPhoneListener    phoneListener;
    private TelephonyCallback     telephonyCallback;
    private ScheduledExecutorService scheduler;

    // ── Lifecycle ────────────────────────────────────────────────────────────

    static void start(Context context) {
        Intent intent = new Intent(context, NexusRelayForegroundService.class);
        intent.setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    static void stop(Context context) {
        Intent intent = new Intent(context, NexusRelayForegroundService.class);
        intent.setAction(ACTION_STOP);
        context.startService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;

        if (ACTION_STOP.equals(action)) {
            stopNativePolling();
            unregisterCallStateListener();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        boolean relayActive = getSharedPreferences(NexusRelayPlugin.PREFS_NAME, MODE_PRIVATE)
            .getBoolean(NexusRelayPlugin.KEY_IS_ACTIVE, false);
        if (!relayActive) {
            stopNativePolling();
            unregisterCallStateListener();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification());
        registerCallStateListener();
        startNativePolling();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopNativePolling();
        unregisterCallStateListener();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ── Native outbox polling ─────────────────────────────────────────────────

    private void startNativePolling() {
        if (scheduler != null && !scheduler.isShutdown()) return;
        Log.d(TAG, "Starting native outbox polling every " + POLL_INTERVAL_S + "s");
        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleWithFixedDelay(this::pollOutboxNative,
            INITIAL_DELAY_S, POLL_INTERVAL_S, TimeUnit.SECONDS);
    }

    private void stopNativePolling() {
        if (scheduler != null) {
            scheduler.shutdownNow();
            scheduler = null;
        }
    }

    /**
     * Polls /api/messages/outbox?profileId=xxx and sends each pending SMS
     * via SmsManager. Runs in a background thread — screen-off safe.
     */
    private void pollOutboxNative() {
        SharedPreferences prefs = getSharedPreferences(NexusRelayPlugin.PREFS_NAME, MODE_PRIVATE);
        if (!prefs.getBoolean(NexusRelayPlugin.KEY_IS_ACTIVE, false)) {
            Log.d(TAG, "pollOutboxNative: relay not active, skipping");
            return;
        }

        String baseUrl       = prefs.getString(NexusRelayPlugin.KEY_BASE_URL, null);
        String profileId     = prefs.getString(NexusRelayPlugin.KEY_PROFILE_ID, null);
        String installationId = prefs.getString(NexusRelayPlugin.KEY_INSTALLATION_ID, null);

        if (baseUrl == null || profileId == null) {
            Log.w(TAG, "pollOutboxNative: missing baseUrl or profileId");
            return;
        }

        try {
            // Derive the API base (strip trailing /api/device/relay if present)
            String apiBase = baseUrl.replaceAll("/api/device/relay$", "")
                                    .replaceAll("/api$", "");

            String outboxUrl = apiBase + "/api/messages/outbox?profileId=" + profileId;
            if (installationId != null && !installationId.isEmpty()) {
                outboxUrl += "&installationId=" + installationId;
            }

            URL url = new URL(outboxUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int code = conn.getResponseCode();
            if (code != 200) {
                Log.w(TAG, "pollOutboxNative: outbox returned HTTP " + code);
                conn.disconnect();
                return;
            }

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();
            conn.disconnect();

            org.json.JSONArray messages = new org.json.JSONArray(sb.toString());
            if (messages.length() == 0) return;

            Log.d(TAG, "pollOutboxNative: " + messages.length() + " pending message(s)");

            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            for (int i = 0; i < messages.length(); i++) {
                org.json.JSONObject msg = messages.getJSONObject(i);
                String messageId = msg.optString("id");
                String to        = msg.optString("to");
                String text      = msg.optString("text");

                if (to.isEmpty() || text.isEmpty()) continue;

                try {
                    if (text.length() > 160) {
                        java.util.ArrayList<String> parts = smsManager.divideMessage(text);
                        smsManager.sendMultipartTextMessage(to, null, parts, null, null);
                    } else {
                        smsManager.sendTextMessage(to, null, text, null, null);
                    }
                    Log.d(TAG, "pollOutboxNative: SMS sent to " + to + " (msg=" + messageId + ")");
                    updateMessageStatus(apiBase, messageId, "sent");
                } catch (Exception smsEx) {
                    Log.e(TAG, "pollOutboxNative: SMS send failed for " + messageId, smsEx);
                    updateMessageStatus(apiBase, messageId, "failed");
                }
            }

        } catch (Exception e) {
            Log.e(TAG, "pollOutboxNative: error", e);
        }
    }

    /**
     * PATCH /api/messages/{id}/status — marks message as sent or failed.
     */
    private void updateMessageStatus(String apiBase, String messageId, String status) {
        if (messageId == null || messageId.isEmpty()) return;
        try {
            URL url = new URL(apiBase + "/api/messages/" + messageId + "/status");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PATCH");
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            String body = "{\"status\":\"" + status + "\"}";
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            Log.d(TAG, "updateMessageStatus: " + messageId + " -> " + status + " (HTTP " + code + ")");
            conn.disconnect();
        } catch (Exception e) {
            Log.w(TAG, "updateMessageStatus: failed for " + messageId, e);
        }
    }

    // ── Notification ──────────────────────────────────────────────────────────

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.relay_service_title))
            .setContentText(getString(R.string.relay_service_text))
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            getString(R.string.relay_service_channel_name),
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(getString(R.string.relay_service_channel_desc));
        nm.createNotificationChannel(channel);
    }

    // ── Call state ────────────────────────────────────────────────────────────

    private void registerCallStateListener() {
        if (telephonyManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (telephonyCallback != null) return;
                telephonyCallback = new ServiceCallStateCallback(this);
                telephonyManager.registerTelephonyCallback(getMainExecutor(), telephonyCallback);
                return;
            }
            if (phoneListener != null) return;
            phoneListener = new NexusPhoneListener(this);
            telephonyManager.listen(phoneListener, PhoneStateListener.LISTEN_CALL_STATE);
        } catch (SecurityException ex) {
            Log.w(TAG, "Missing permission for call state listener", ex);
        }
    }

    private void unregisterCallStateListener() {
        if (telephonyManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (telephonyCallback != null) {
                    telephonyManager.unregisterTelephonyCallback(telephonyCallback);
                    telephonyCallback = null;
                }
                return;
            }
            if (phoneListener != null) {
                telephonyManager.listen(phoneListener, PhoneStateListener.LISTEN_NONE);
                phoneListener = null;
            }
        } catch (Exception ex) {
            Log.w(TAG, "Call state listener unregister failed", ex);
        }
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private static class ServiceCallStateCallback extends TelephonyCallback
            implements TelephonyCallback.CallStateListener {
        private final Context context;

        ServiceCallStateCallback(Context context) {
            this.context = context;
        }

        @Override
        public void onCallStateChanged(int state) {
            NexusRelayPlugin.onCallStateChanged(context, null, NexusRelayPlugin.toCallStateString(state));
        }
    }
}
