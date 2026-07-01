package com.nexushub.app;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

/**
 * Stub service povinný pro registraci jako výchozí SMS aplikace (Quick Response via Message).
 */
public class NexusHeadlessSmsSendService extends Service {
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Zde by normálně proběhlo odeslání zprávy z "Rychlé odpovědi" (např. při zamítnutí hovoru)
        // Vzhledem k tomu, že Relay zprávy synchronizuje na server, tohle teď řešit nemusíme
        return START_NOT_STICKY;
    }
}
