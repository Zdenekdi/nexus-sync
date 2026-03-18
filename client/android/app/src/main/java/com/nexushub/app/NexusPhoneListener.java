package com.nexushub.app;

import android.telephony.PhoneStateListener;

@SuppressWarnings("deprecation")
public class NexusPhoneListener extends PhoneStateListener {
    @Override
    public void onCallStateChanged(int state, String phoneNumber) {
        if (NexusRelayPlugin.instance != null) {
            NexusRelayPlugin.onCallStateChanged(phoneNumber, NexusRelayPlugin.toCallStateString(state));
        }
    }
}
