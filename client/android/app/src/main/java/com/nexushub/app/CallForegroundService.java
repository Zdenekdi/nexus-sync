package com.nexushub.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class CallForegroundService extends Service {

    private static final String TAG            = "CallForegroundService";
    private static final String CHANNEL_ID     = "nexushub_call_channel";
    private static final int    NOTIFICATION_ID = 1001;

    public static final String ACTION_ANSWER  = "com.nexushub.app.ANSWER";
    public static final String ACTION_REJECT  = "com.nexushub.app.REJECT";
    public static final String ACTION_HANGUP  = "com.nexushub.app.HANGUP";

    private final IBinder binder    = new CallBinder();
    private String        callerName = "Příchozí hovor";
    private String        callState  = "incoming";

    public class CallBinder extends Binder {
        CallForegroundService getService() { return CallForegroundService.this; }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();

        String cn = intent.getStringExtra("callerName");
        String cs = intent.getStringExtra("callState");
        if (cn != null) callerName = cn;
        if (cs != null) callState  = cs;

        NexusSipPlugin plugin = NexusSipPlugin.getInstance();

        if (ACTION_ANSWER.equals(action)) {
            if (plugin != null) plugin.answerFromNotification();
            callState = "active";
        } else if (ACTION_REJECT.equals(action)) {
            if (plugin != null) plugin.rejectFromNotification();
            stopSelf();
            return START_NOT_STICKY;
        } else if (ACTION_HANGUP.equals(action)) {
            if (plugin != null) plugin.hangupFromNotification();
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification());
        return START_STICKY;
    }

    // ─── Aktualizace notifikace ──────────────────────────────────

    public void updateNotification(String state, String caller) {
        this.callState  = state;
        this.callerName = caller;
        NotificationManager nm =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
    }

    // ─── Sestavení notifikace ────────────────────────────────────

    private Notification buildNotification() {
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
            this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_call)
            .setContentTitle(callerName)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(openPi, true)
            .setContentIntent(openPi);

        if ("incoming".equals(callState)) {
            builder.setContentText("Příchozí hovor");
            builder.addAction(R.drawable.ic_call_answer, "Přijmout", buildActionIntent(ACTION_ANSWER));
            builder.addAction(R.drawable.ic_call_end,    "Odmítnout", buildActionIntent(ACTION_REJECT));
        } else {
            builder.setContentText("Probíhá hovor");
            builder.addAction(R.drawable.ic_call_end, "Zavěsit", buildActionIntent(ACTION_HANGUP));
            builder.setUsesChronometer(true);
            builder.setChronometerCountDown(false);
        }

        return builder.build();
    }

    private PendingIntent buildActionIntent(String action) {
        Intent intent = new Intent(this, CallForegroundService.class);
        intent.setAction(action);
        return PendingIntent.getService(
            this, action.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    // ─── Notification channel ────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Telefonní hovory", NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifikace aktivního hovoru");
            channel.enableVibration(true);
            channel.setShowBadge(true);
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    @Override public IBinder onBind(Intent intent) { return binder; }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "CallForegroundService zastaven");
    }
}
