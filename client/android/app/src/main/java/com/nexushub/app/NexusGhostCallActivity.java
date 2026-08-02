package com.nexushub.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Fantomový hovor — nativní obrazovka „příchozího hovoru".
 *
 * Proč nativní a ne webové UI: web běží uvnitř aplikace, takže se zobrazí jen když
 * ji má modelka otevřenou. Neprobudí displej ani se neukáže přes zámek — a hovor,
 * který má být záminkou k odchodu, potřebuje zazvonit hlavně tehdy, když telefon
 * leží zamčený na stole nebo v kabelce.
 *
 * Aktivita se proto spouští z full-screen intent notifikace (stejný mechanismus,
 * jakým se hlásí skutečné hovory), rozsvítí displej a zobrazí se nad zámkem.
 */
public class NexusGhostCallActivity extends Activity {

    public static final String EXTRA_CALLER = "ghostCaller";

    private Ringtone ringtone;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showOverLockScreen();
        setContentView(buildUi(getIntent().getStringExtra(EXTRA_CALLER)));
        startRinging();
    }

    private void showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }
    }

    private View buildUi(String caller) {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(Color.parseColor("#16213e"));
        int pad = dp(32);
        root.setPadding(pad, dp(96), pad, dp(64));

        TextView title = new TextView(this);
        title.setText(caller == null || caller.isEmpty() ? "Agency Relay" : caller);
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 28);
        title.setGravity(Gravity.CENTER);
        root.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText(getString(R.string.ghost_call_incoming));
        subtitle.setTextColor(Color.parseColor("#9aa4bf"));
        subtitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        subParams.topMargin = dp(12);
        root.addView(subtitle, subParams);

        // Mezera, ať jsou tlačítka dole jako u skutečného hovoru.
        View spacer = new View(this);
        root.addView(spacer, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        buttons.setGravity(Gravity.CENTER);

        Button decline = new Button(this);
        decline.setText(getString(R.string.ghost_call_decline));
        decline.setAllCaps(false);
        decline.setTextColor(Color.WHITE);
        decline.setBackgroundColor(Color.parseColor("#ef4444"));
        decline.setOnClickListener(v -> finishCall());

        Button accept = new Button(this);
        accept.setText(getString(R.string.ghost_call_accept));
        accept.setAllCaps(false);
        accept.setTextColor(Color.WHITE);
        accept.setBackgroundColor(Color.parseColor("#22c55e"));
        // „Přijetí" hovor jen utne — žádný zvuk nepřenášíme, jde o záminku k odchodu.
        accept.setOnClickListener(v -> finishCall());

        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(dp(130), dp(56));
        bp.setMargins(dp(12), 0, dp(12), 0);
        buttons.addView(decline, bp);
        buttons.addView(accept, new LinearLayout.LayoutParams(bp));
        root.addView(buttons);

        return root;
    }

    private void startRinging() {
        try {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ringtone = RingtoneManager.getRingtone(getApplicationContext(), uri);
            if (ringtone != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    ringtone.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
                }
                ringtone.play();
            }
        } catch (Exception ignored) { }

        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            long[] pattern = { 0, 800, 900 };
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) { }
    }

    private void stopRinging() {
        try { if (ringtone != null && ringtone.isPlaying()) ringtone.stop(); } catch (Exception ignored) { }
        try { if (vibrator != null) vibrator.cancel(); } catch (Exception ignored) { }
    }

    private void finishCall() {
        stopRinging();
        finish();
    }

    @Override
    protected void onDestroy() {
        stopRinging();
        super.onDestroy();
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }
}
