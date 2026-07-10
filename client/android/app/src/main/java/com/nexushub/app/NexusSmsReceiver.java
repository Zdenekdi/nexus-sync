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
        final Context appContext = context.getApplicationContext();
        final Runnable finishReceiver = new Runnable() {
            @Override
            public void run() {
                try {
                    result.finish();
                } finally {
                    if (wakeLock != null && wakeLock.isHeld()) {
                        wakeLock.release();
                    }
                }
            }
        };

        try {
            String sender = null;
            long timestamp = 0L;
            StringBuilder bodyBuilder = new StringBuilder();

            for (SmsMessage smsMessage : messages) {
                if (smsMessage == null) {
                    continue;
                }
                if (sender == null || sender.isEmpty()) {
                    sender = smsMessage.getDisplayOriginatingAddress();
                }
                if (timestamp == 0L) {
                    timestamp = smsMessage.getTimestampMillis();
                }
                String bodyPart = smsMessage.getDisplayMessageBody();
                if (bodyPart != null) {
                    bodyBuilder.append(bodyPart);
                }
            }

            if (bodyBuilder.length() > 0) {
                NexusRelayPlugin.onSmsBroadcastReceived(
                    appContext,
                    sender,
                    bodyBuilder.toString(),
                    timestamp,
                    Telephony.Sms.Intents.SMS_DELIVER_ACTION.equals(action),
                    finishReceiver
                );
            } else {
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            NexusRelayPlugin.syncSmsHistoryNative(appContext, 25, 10 * 60_000L);
                        } finally {
                            finishReceiver.run();
                        }
                    }
                }).start();
            }
        } catch (Exception e) {
            finishReceiver.run();
        }
    }
}
