package com.nexushub.app;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

/**
 * Stub service povinná pro registraci jako výchozí SMS aplikace.
 * MMS nepodporujeme — stub postačí pro systémovou registraci.
 */
public class NexusMmsService extends Service {
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
