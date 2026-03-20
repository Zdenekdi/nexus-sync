package com.nexushub.app;

import android.content.Context;
import android.telephony.PhoneStateListener;

@SuppressWarnings("deprecation")
public class NexusPhoneListener extends PhoneStateListener {
    private Context context;

    public NexusPhoneListener(Context context) {
        this.context = context;
    }

    @Override
    public void onCallStateChanged(int state, String phoneNumber) {
        NexusRelayPlugin.onCallStateChanged(context, phoneNumber, NexusRelayPlugin.toCallStateString(state));
    }
}
