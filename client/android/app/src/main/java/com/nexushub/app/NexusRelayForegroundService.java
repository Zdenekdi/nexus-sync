package com.nexushub.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;

public class NexusRelayForegroundService extends Service {
    static final String ACTION_START = "com.nexushub.app.action.RELAY_START";
    static final String ACTION_STOP = "com.nexushub.app.action.RELAY_STOP";

    private static final String CHANNEL_ID = "nexus-relay-foreground";
    private static final int NOTIFICATION_ID = 10021;

    private TelephonyManager telephonyManager;
    private NexusPhoneListener phoneListener;
    private TelephonyCallback telephonyCallback;

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
            unregisterCallStateListener();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        boolean relayActive = getSharedPreferences(NexusRelayPlugin.PREFS_NAME, MODE_PRIVATE)
            .getBoolean(NexusRelayPlugin.KEY_IS_ACTIVE, false);
        if (!relayActive) {
            unregisterCallStateListener();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification());
        registerCallStateListener();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        unregisterCallStateListener();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

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
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            getString(R.string.relay_service_channel_name),
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(getString(R.string.relay_service_channel_desc));
        nm.createNotificationChannel(channel);
    }

    private void registerCallStateListener() {
        if (telephonyManager == null) {
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (telephonyCallback != null) {
                    return;
                }
                telephonyCallback = new ServiceCallStateCallback(this);
                telephonyManager.registerTelephonyCallback(getMainExecutor(), telephonyCallback);
                return;
            }

            if (phoneListener != null) {
                return;
            }
            phoneListener = new NexusPhoneListener(this);
            telephonyManager.listen(phoneListener, PhoneStateListener.LISTEN_CALL_STATE);
        } catch (SecurityException ex) {
            android.util.Log.w("NexusRelayService", "Missing permission for call state listener", ex);
        }
    }

    private void unregisterCallStateListener() {
        if (telephonyManager == null) {
            return;
        }

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
            android.util.Log.w("NexusRelayService", "Call state listener unregister failed", ex);
        }
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private static class ServiceCallStateCallback extends TelephonyCallback implements TelephonyCallback.CallStateListener {
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

