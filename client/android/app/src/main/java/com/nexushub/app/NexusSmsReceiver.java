package com.nexushub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.provider.Telephony;
import android.telephony.SmsMessage;

public class NexusSmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(action) &&
            !Telephony.Sms.Intents.SMS_DELIVER_ACTION.equals(action)) {
            return;
        }

        SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (messages == null) {
            return;
        }

        // Acquire a WakeLock so the CPU stays awake long enough for the HTTP
        // forwarding thread in NexusRelayPlugin to complete (screen may be off).
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        final PowerManager.WakeLock wakeLock = pm != null
            ? pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NexusHub:SmsRelay")
            : null;
        if (wakeLock != null) {
            wakeLock.acquire(30_000L); // 30s max — HTTP timeout is 12s
        }

        // goAsync() keeps the BroadcastReceiver alive while we hand off to the
        // plugin (which spawns its own thread); finish() signals Android we're done.
        final PendingResult result = goAsync();

        try {
            for (SmsMessage smsMessage : messages) {
                if (smsMessage == null) {
                    continue;
                }
                String sender = smsMessage.getDisplayOriginatingAddress();
                String body = smsMessage.getDisplayMessageBody();
                NexusRelayPlugin.onMessageReceived(context, sender, body);
            }
        } finally {
            result.finish();
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }
}
