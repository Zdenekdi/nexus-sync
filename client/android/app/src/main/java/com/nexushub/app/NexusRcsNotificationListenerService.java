package com.nexushub.app;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.text.TextUtils;

public class NexusRcsNotificationListenerService extends NotificationListenerService {
    private static final long DEDUP_WINDOW_MS = 5000L;
    private static String lastFingerprint;
    private static long lastSeenAt;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) {
            return;
        }

        if (!NexusRelayPlugin.isRcsPackageSupported(sbn.getPackageName())) {
            return;
        }

        Notification notification = sbn.getNotification();
        if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
            return;
        }

        Bundle extras = notification.extras;
        if (extras == null) {
            return;
        }

        CharSequence title = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE);
        if (TextUtils.isEmpty(title)) {
            title = extras.getCharSequence(Notification.EXTRA_TITLE);
        }

        CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
        if (TextUtils.isEmpty(text)) {
            text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        }

        String from = title != null ? title.toString().trim() : "";
        String body = text != null ? text.toString().trim() : "";

        if (TextUtils.isEmpty(from) || TextUtils.isEmpty(body)) {
            return;
        }

        if (body.startsWith("You:") || body.equalsIgnoreCase("Sending...") || body.equalsIgnoreCase("New messages")) {
            return;
        }

        if (NexusRelayPlugin.wasRecentlyCapturedViaSms(body)) {
            return;
        }

        String fingerprint = sbn.getPackageName() + "|" + from + "|" + body;
        long now = System.currentTimeMillis();
        synchronized (NexusRcsNotificationListenerService.class) {
            if (fingerprint.equals(lastFingerprint) && (now - lastSeenAt) < DEDUP_WINDOW_MS) {
                return;
            }
            lastFingerprint = fingerprint;
            lastSeenAt = now;
        }

        NexusRelayPlugin.onRcsMessageReceived(getApplicationContext(), from, body, sbn.getPackageName());
    }
}

