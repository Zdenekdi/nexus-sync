package com.nexushub.app;

import android.app.Activity;
import android.os.Bundle;

/**
 * Stub aktivita povinná pro registraci jako výchozí SMS aplikace.
 * Reálně zprávy píšeme přes webové rozhraní.
 */
public class NexusSmsComposeActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Okamžitě zavři — psaní SMS jde přes web rozhraní
        finish();
    }
}
