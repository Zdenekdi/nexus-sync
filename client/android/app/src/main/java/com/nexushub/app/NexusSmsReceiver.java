package com.nexushub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

public class NexusSmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }

        SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (messages == null) {
            return;
        }

        for (SmsMessage smsMessage : messages) {
            if (smsMessage == null) {
                continue;
            }

            String sender = smsMessage.getDisplayOriginatingAddress();
            String body = smsMessage.getDisplayMessageBody();
            NexusRelayPlugin.onMessageReceived(sender, body);
        }
    }
}
