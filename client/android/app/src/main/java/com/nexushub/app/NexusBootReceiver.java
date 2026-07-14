package com.nexushub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class NexusBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) &&
            !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        boolean relayActive = NexusRelayPlugin.securePrefs(context, NexusRelayPlugin.PREFS_NAME)
            .getBoolean(NexusRelayPlugin.KEY_IS_ACTIVE, false);
        if (relayActive) {
            NexusRelayForegroundService.start(context);
        }
    }
}

