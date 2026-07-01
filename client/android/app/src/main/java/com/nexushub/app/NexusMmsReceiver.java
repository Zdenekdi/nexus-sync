package com.nexushub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Stub receiver povinný pro registraci jako výchozí SMS aplikace (pro příjem MMS/WAP PUSH).
 */
public class NexusMmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        // Zde by normálně proběhlo stažení MMS, ale Relay to teď nemusí řešit plně (nebo případně předáme logiku dál)
    }
}
