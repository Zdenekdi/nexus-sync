package com.nexushub.app;

import android.os.Bundle;
import android.graphics.Color;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NexusRelayPlugin.class);
        registerPlugin(NexusSipPlugin.class);
        registerPlugin(NexusInCallPlugin.class);
        
        try {
            // Inicializace Firebase, pokud už není inicializována (např. chybějícím google-services.json)
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Firebase initialization failed", e);
        }


        super.onCreate(savedInstanceState);

        // Keep system bars visually consistent with app shell and avoid white top strip.
        try {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.parseColor("#07080a"));
        } catch (Exception e) {
            android.util.Log.w("MainActivity", "System bar styling failed", e);
        }
    }
}
