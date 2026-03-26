package com.nexushub.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.ProcessLifecycleOwner;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Custom FCM service for Nexus Relay.
 *
 * Responsibilities:
 *  1. Persist refreshed FCM tokens and propagate them to NexusRelayPlugin
 *     (so the web layer can re-register with the backend).
 *  2. Display a system notification for DATA-ONLY FCM messages received
 *     while the app is in the background / killed (Firebase does not show
 *     system trays for data-only messages automatically).
 *
 * For messages that carry a `notification` payload Android / Firebase handles
 * the tray display itself; this service only needs to cover the data-only case.
 *
 * This service extends Capacitor's own MessagingService so the standard
 * PushNotifications plugin callbacks keep working via super.onNewToken /
 * super.onMessageReceived.
 */
public class NexusFcmService extends MessagingService {

    private static final String TAG = "NexusFcmService";
    private static final String PREFS_NAME = "nexus_fcm_prefs";
    static final String PREF_FCM_TOKEN = "fcm_token";

    static final String CHANNEL_ID = "nexus_push_channel";
    private static final String CHANNEL_NAME = "Nexus Relay Notifications";
    private static final String CHANNEL_DESC = "Incoming messages and calls";

    // -----------------------------------------------------------------------
    // Token refresh
    // -----------------------------------------------------------------------

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed");

        // 1. Persist locally so MainActivity / plugin can read it on startup.
        storeToken(token);

        // 2. Notify the Capacitor plugin instance (if alive) so it can
        //    re-register with the backend without a full app restart.
        NexusRelayPlugin.onFcmTokenRefreshed(token);
    }

    // -----------------------------------------------------------------------
    // Message handling (data-only messages received in background/killed)
    // -----------------------------------------------------------------------

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        // Notification payloads are already handled by Firebase / Capacitor.
        if (remoteMessage.getNotification() != null) {
            return;
        }

        Map<String, String> data = remoteMessage.getData();
        if (data.isEmpty()) {
            return;
        }

        // ── Relay command: send_sms ──────────────────────────────────────────
        // This FCM message is a COMMAND sent by the Hub operator to reply to a
        // real SMS. Handle it natively so it works even when the app is killed
        // or the screen is off (JS layer is not running).
        String msgType = data.get("type");
        if ("send_sms".equals(msgType)) {
            Log.d(TAG, "[Relay] FCM send_sms received – executing natively");
            NexusRelayPlugin.sendSmsFromData(getApplicationContext(), data);
            return;
        }

        // DATA-ONLY message: if the app is backgrounded, show a system tray
        // notification ourselves. Foreground handling is left to the JS layer.
        if (isAppInForeground()) {
            return;
        }

        String title = data.containsKey("title") ? data.get("title") : getString(R.string.app_name);
        String body  = data.containsKey("body")  ? data.get("body")  :
                       data.containsKey("message") ? data.get("message") : "";

        if (body.isEmpty()) {
            return;
        }

        showNotification(title, body, data);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private void storeToken(String token) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_FCM_TOKEN, token)
            .apply();
    }

    /** Returns the last known FCM token, or null if none has been issued yet. */
    public static String getStoredToken(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(PREF_FCM_TOKEN, null);
    }

    private boolean isAppInForeground() {
        Lifecycle.State state = ProcessLifecycleOwner.get().getLifecycle().getCurrentState();
        return state.isAtLeast(Lifecycle.State.STARTED);
    }

    private void showNotification(String title, String body, Map<String, String> data) {
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        ensureNotificationChannel(manager);

        // Launch intent – opens MainActivity when the notification is tapped.
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            // Pass FCM data so the app can navigate to the right screen.
            for (Map.Entry<String, String> entry : data.entrySet()) {
                launchIntent.putExtra(entry.getKey(), entry.getValue());
            }
        }

        int requestCode = (int) (System.currentTimeMillis() & 0xfffffff);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, requestCode, launchIntent != null ? launchIntent : new Intent(), flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent);

        int notificationId = requestCode;
        manager.notify(notificationId, builder.build());
    }

    private void ensureNotificationChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
        if (channel != null) return;

        channel = new NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(CHANNEL_DESC);
        manager.createNotificationChannel(channel);
    }
}

