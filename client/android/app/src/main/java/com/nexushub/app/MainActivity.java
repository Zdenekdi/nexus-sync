package com.nexushub.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NexusRelayPlugin.class);
        
        try {
            // Inicializace Firebase, pokud už není inicializována (např. chybějícím google-services.json)
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Firebase initialization failed", e);
        }

        super.onCreate(savedInstanceState);
    }
}
