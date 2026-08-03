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

    private static final String GHOST_CALL_CHANNEL_ID = "nexus-ghost-call";
    private static final int GHOST_CALL_NOTIFICATION_ID = 10041;

    private static final String TAG = "NexusFcmService";
    private static final String PREFS_NAME = "nexus_fcm_prefs";
    static final String PREF_FCM_TOKEN = "fcm_token";

    static final String CHANNEL_ID = "nexus_push_channel";
    private static final String CHANNEL_NAME = "Nexus Relay Notifications";
    private static final String CHANNEL_DESC = "Incoming messages and calls";

    /*
     * Bezpečnostní upozornění mají vlastní kanál.
     *
     * Dosud šlo všechno jedním kanálem se stejnou důležitostí — SOS i „přišla
     * nová zpráva". To má dva následky, které u bezpečnostního produktu vadí:
     * operátor, který si ztlumí notifikace kvůli zprávám, si tím ztlumí i SOS,
     * a poplach se dá odsunout swipem jako běžná zpráva.
     *
     * Oddělený kanál umožní ztlumit provozní šum a nechat poplach hlasitý,
     * a Android ho pustí i přes Nerušit.
     */
    // POZOR: tohle id se MUSÍ shodovat s tím, co posílá server v
    // android.notification.channelId (pushService.js, buildSafetyPushPayload).
    // Dosud se neshodovalo — server posílal na "nexus-emergency", aplikace ten
    // kanál nikdy nevytvořila a v manifestu nebyl ani výchozí. Na Androidu 8+
    // taková notifikace skončí v náhradním kanálu, klidně s nízkou důležitostí.
    // Bezpečnostní poplach tedy mohl dorazit potichu.
    private static final String SOS_CHANNEL_ID = "nexus-emergency";
    private static final String SOS_CHANNEL_NAME = "Bezpečnostní poplach (SOS)";
    private static final String SOS_CHANNEL_DESC = "SOS a eskalace bezpečnostních relací. Nedoporučujeme vypínat.";

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

        // ── Fantomový hovor ──────────────────────────────────────────────────
        // Musí zazvonit i když telefon leží zamčený — proto full-screen intent
        // notifikace (stejný mechanismus jako u skutečných hovorů), která
        // rozsvítí displej a otevře obrazovku hovoru nad zámkem. Webové UI to
        // neumí: běží jen když má uživatelka aplikaci otevřenou.
        if ("ghost_call".equals(msgType)) {
            Log.d(TAG, "[GhostCall] FCM received – showing full-screen call");
            showGhostCall(data.get("profileName"));
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


    /** Full-screen intent notifikace, která probudí telefon a otevře obrazovku hovoru. */
    private void showGhostCall(String callerName) {
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                GHOST_CALL_CHANNEL_ID, "Fantomový hovor", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Simulovaný příchozí hovor jako záminka k odchodu");
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);
        }

        Intent callIntent = new Intent(this, NexusGhostCallActivity.class);
        callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        callIntent.putExtra(NexusGhostCallActivity.EXTRA_CALLER, callerName);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getActivity(this, 4711, callIntent, flags);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, GHOST_CALL_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentTitle(callerName == null || callerName.isEmpty() ? "Agency Relay" : callerName)
            .setContentText(getString(R.string.ghost_call_incoming))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOngoing(false)
            .setFullScreenIntent(pending, true);   // true = zobraz rovnou, ne jen heads-up

        manager.notify(GHOST_CALL_NOTIFICATION_ID, b.build());

        // Od Androidu 14 musí být full-screen intent výslovně povolený; bez toho
        // systém zobrazí jen běžnou notifikaci (ta probudí displej a je vidět na
        // zámku, takže funguje jako záloha). Přímé startActivity() tu nezkoušíme:
        // spuštění aktivity z pozadí systém stejně zablokuje (BAL) a jen by to
        // plnilo log chybami.
        if (Build.VERSION.SDK_INT >= 34 && !manager.canUseFullScreenIntent()) {
            Log.w(TAG, "[GhostCall] Full-screen intent not permitted — only a notification will show. "
                + "Grant it in app notification settings (and on MIUI also 'display pop-up windows while running in background').");
        }
    }

    private void storeToken(String token) {
        NexusRelayPlugin.securePrefs(this, PREFS_NAME)
            .edit()
            .putString(PREF_FCM_TOKEN, token)
            .apply();
    }

    /** Returns the last known FCM token, or null if none has been issued yet. */
    public static String getStoredToken(Context context) {
        SharedPreferences prefs = NexusRelayPlugin.securePrefs(context, PREFS_NAME);
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

        boolean isSafety = "safety_alert".equals(data.get("type"));

        NotificationCompat.Builder builder =
            new NotificationCompat.Builder(this, isSafety ? SOS_CHANNEL_ID : CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setContentIntent(pendingIntent);

        if (isSafety) {
            // CATEGORY_ALARM: Android smí poplach pustit i přes Nerušit.
            // setOngoing: poplach nejde odsunout swipem — musí se otevřít.
            // Bez autoCancel by zůstal viset i po otevření, proto ho necháváme.
            builder.setCategory(NotificationCompat.CATEGORY_ALARM)
                   .setPriority(NotificationCompat.PRIORITY_MAX)
                   .setOngoing(true)
                   .setAutoCancel(true)
                   .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        } else {
            builder.setAutoCancel(true)
                   .setPriority(NotificationCompat.PRIORITY_HIGH);
        }

        int notificationId = requestCode;
        manager.notify(notificationId, builder.build());
    }

    /**
     * Vytvoří notifikační kanály.
     *
     * Volá se i z MainActivity při startu, ne jen při první data-only zprávě.
     * Bezpečnostní poplach totiž chodí s `notification` blokem — na pozadí ho
     * zobrazí Firebase bez zavolání téhle služby, takže kanál v tu chvíli už
     * musí existovat. Jinak notifikace skončí v náhradním kanálu.
     */
    static void ensureNotificationChannels(NotificationManager manager) {
        if (manager == null) return;
        createChannels(manager);
    }

    private void ensureNotificationChannel(NotificationManager manager) {
        createChannels(manager);
    }

    private static void createChannels(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(CHANNEL_DESC);
            manager.createNotificationChannel(channel);
        }

        if (manager.getNotificationChannel(SOS_CHANNEL_ID) == null) {
            NotificationChannel sos = new NotificationChannel(
                SOS_CHANNEL_ID,
                SOS_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            sos.setDescription(SOS_CHANNEL_DESC);
            // Poplach musí projít i přes Nerušit. Uživatel to pořád může
            // v nastavení kanálu vypnout — ale je to jeho vědomé rozhodnutí,
            // ne vedlejší efekt ztlumení zpráv.
            sos.setBypassDnd(true);
            sos.enableVibration(true);
            sos.setVibrationPattern(new long[]{ 0, 500, 250, 500 });
            sos.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            sos.setShowBadge(true);
            manager.createNotificationChannel(sos);
        }
    }
}

