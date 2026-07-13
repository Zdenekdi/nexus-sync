package com.nexushub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.util.Log;

public class NexusCallReceiver extends BroadcastReceiver {
    private static String lastState = "IDLE";
    private static String lastNumber = "";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.intent.action.PHONE_STATE".equals(intent.getAction())) {
            return;
        }

        String stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        String number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

        if (stateStr == null) return;
        
        // Convert Intent state strings to our standard format
        String state = "IDLE";
        if (TelephonyManager.EXTRA_STATE_RINGING.equals(stateStr)) {
            state = "RINGING";
        } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(stateStr)) {
            state = "OFFHOOK";
        }

        if (number == null) {
            number = lastNumber;
        } else {
            lastNumber = number;
        }

        if (state.equals(lastState)) {
            return; // Prevent duplicate events
        }
        lastState = state;

        if (state.equals("IDLE")) {
            lastNumber = ""; // Reset after call ends
            return;
        }

        // Telefonní číslo je PII — logujeme jen v debug buildu (jinak končí v logcatu)
        if (BuildConfig.DEBUG) {
            Log.d("NexusRelay", "Call state changed via Receiver: " + state + " from " + number);
        }
        NexusRelayPlugin.onCallStateChanged(context, number, state);
    }
}
