package com.nexushub.app;

import android.Manifest;
 import android.app.NotificationManager;
 import android.content.Context;
 import android.content.Intent;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.zoolu.sip.address.NameAddress;
import org.zoolu.sip.call.Call;
import org.zoolu.sip.call.CallListener;
import org.zoolu.sip.message.Message;
import org.zoolu.sip.provider.SipProvider;
import org.zoolu.sip.provider.SipStack;
import org.zoolu.sdp.SessionDescriptor;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.Vector;

@CapacitorPlugin(
    name = "NexusSip",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class NexusSipPlugin extends Plugin implements CallListener {

    private static final String TAG     = "NexusSipPlugin";

    // Singleton — přístup z CallForegroundService
    private static NexusSipPlugin instance;
    public static NexusSipPlugin getInstance() { return instance; }

    private SipProvider        sipProvider;
    private NexusSipRegistrar  registrar;
    private Call               currentCall;
    private String             currentCallId = "";
    private AudioManager       audioManager;
    private boolean            isMuted    = false;
    private boolean            isSpeaker  = false;
    private long               callStartMs = 0;
    private String             lastCallerId = "";

    // Historie hovorů (max 200)
    private final List<JSObject> callHistory = new ArrayList<>();

    // ─── load ────────────────────────────────────────────────────────────────

    @Override
    public void load() {
        super.load();
        instance     = this;
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    /**
     * Na Android 14+ (API 34) vyžaduje USE_FULL_SCREEN_INTENT explicitní grant.
     * Pokud není udělen, emitujeme JS event a přísměrujeme uživatele do nastavení.
     */
    private void checkFullScreenIntentPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return; // < API 34

        NotificationManager nm =
            (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && !nm.canUseFullScreenIntent()) {
            Log.w(TAG, "USE_FULL_SCREEN_INTENT není povolen — hovor na lock screenu nebude fungovat");

            // Emituj event do JS — UI může zobrazit banner
            JSObject ev = new JSObject();
            ev.put("permission", "USE_FULL_SCREEN_INTENT");
            ev.put("message",    "Povolte zobrazení hovoru na uzamčené obrazovce v nastavení aplikace.");
            notifyListeners("permissionRequired", ev);

            // Otevři nastavení přímo na správu tohoto oprávnění
            try {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception e) {
                Log.w(TAG, "Nelze otevřít nastavení full screen intent", e);
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopCallService();
        disconnect();
        super.handleOnDestroy();
    }

    // ─── Foreground service lifecycle ────────────────────────────────────────────

    private void startCallService(String callerName, String state) {
        Intent intent = new Intent(getContext(), CallForegroundService.class);
        intent.putExtra("callerName", callerName);
        intent.putExtra("callState",  state);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
    }

    private void stopCallService() {
        try {
            getContext().stopService(new Intent(getContext(), CallForegroundService.class));
        } catch (Exception ignored) {}
    }

    // ─── Metody volané z notifikace (bez PluginCall) ─────────────────────────────

    public void answerFromNotification() {
        if (currentCall == null) return;
        try {
            setupAudioForCall();
            currentCall.accept(buildAnswerSdp().toString());
            callStartMs = System.currentTimeMillis();
            // Aktualizuj notifikaci → "aktivní hovor"
            Intent upd = new Intent(getContext(), CallForegroundService.class);
            upd.putExtra("callState", "active");
            upd.putExtra("callerName", lastCallerId);
            getContext().startService(upd);
            JSObject ev = new JSObject();
            ev.put("status", "answered");
            ev.put("callId", currentCallId);
            notifyListeners("callAnswered", ev);
        } catch (Exception e) {
            Log.e(TAG, "answerFromNotification error", e);
        }
    }

    public void rejectFromNotification() {
        if (currentCall != null) {
            addHistoryRecord(currentCallId, "inbound", "rejected", 0);
            try { currentCall.refuse(); } catch (Exception ignored) {}
            currentCall = null;
        }
        currentCallId = "";
        restoreAudio();
        stopCallService();
        JSObject ev = new JSObject();
        ev.put("status", "rejected");
        notifyListeners("callEnded", ev);
    }

    public void hangupFromNotification() {
        int dur = callStartMs > 0
            ? (int)((System.currentTimeMillis() - callStartMs) / 1000) : 0;
        if (currentCall != null) {
            addHistoryRecord(currentCallId, "inbound", "ended", dur);
            try { currentCall.hangup(); } catch (Exception ignored) {}
            currentCall = null;
        }
        currentCallId = "";
        callStartMs = 0;
        restoreAudio();
        stopCallService();
        JSObject ev = new JSObject();
        ev.put("status", "hangup");
        ev.put("duration", dur);
        notifyListeners("callEnded", ev);
    }

    // ─── initialize ──────────────────────────────────────────────────────────

    @PluginMethod
    public void initialize(PluginCall call) {
        String server   = call.getString("server",   "");
        String username = call.getString("username", "");
        String password = call.getString("password", "");
        int    port     = call.getInt("port", 5060);

        if (server.isEmpty() || username.isEmpty()) {
            call.reject("server a username jsou povinné");
            return;
        }

        // Zkontroluj oprávnění mikrofonu
        if (getPermissionState("microphone") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micGranted");
            return;
        }

        doInitialize(call, server, username, password, port);
    }

    @PermissionCallback
    private void micGranted(PluginCall call) {
        if (getPermissionState("microphone") == com.getcapacitor.PermissionState.GRANTED) {
            String server   = call.getString("server",   "");
            String username = call.getString("username", "");
            String password = call.getString("password", "");
            int    port     = call.getInt("port", 5060);
            doInitialize(call, server, username, password, port);
        } else {
            call.reject("Oprávnění k mikrofonu zamítnuto");
        }
    }

    private void doInitialize(PluginCall call,
                              String server, String username, String password, int port) {
        try {
            disconnect(); // zruš případné předchozí spojení

            SipStack.init(null);
            sipProvider = new SipProvider(server, port);

            registrar = new NexusSipRegistrar(
                sipProvider, username, password, server, this
            );
            registrar.register();

            JSObject result = new JSObject();
            result.put("registered", true);
            result.put("username", username);
            result.put("server", server);
            call.resolve(result);

            Log.d(TAG, "SIP inicializován: " + username + "@" + server + ":" + port);

        } catch (Exception e) {
            Log.e(TAG, "SIP init selhala", e);
            call.reject("Inicializace SIP selhala: " + e.getMessage());
        }
    }

    private void disconnect() {
        if (currentCall != null) {
            try { currentCall.hangup(); } catch (Exception ignored) {}
            currentCall = null;
        }
        currentCallId = "";
        if (registrar != null) {
            try { registrar.unregister(); } catch (Exception ignored) {}
            registrar = null;
        }
        if (sipProvider != null) {
            try { sipProvider.halt(); } catch (Exception ignored) {}
            sipProvider = null;
        }
        restoreAudio();
    }

    // ─── answer ──────────────────────────────────────────────────────────────

    @PluginMethod
    public void answer(PluginCall call) {
        if (currentCall == null) {
            call.reject("Žádný příchozí hovor");
            return;
        }

        try {
            setupAudioForCall();

            SessionDescriptor sdp = buildAnswerSdp();
            currentCall.accept(sdp.toString());

            callStartMs = System.currentTimeMillis();

            JSObject result = new JSObject();
            result.put("status",  "answered");
            result.put("callId",  currentCallId);
            call.resolve(result);
            notifyListeners("callAnswered", result);

            Log.d(TAG, "Hovor přijat: " + currentCallId);

        } catch (Exception e) {
            Log.e(TAG, "answer() selhalo", e);
            call.reject("Přijetí hovoru selhalo: " + e.getMessage());
        }
    }

    // ─── reject ──────────────────────────────────────────────────────────────

    @PluginMethod
    public void reject(PluginCall call) {
        if (currentCall == null) {
            call.reject("Žádný příchozí hovor");
            return;
        }
        try {
            addHistoryRecord(currentCallId, "inbound", "rejected", 0);
            currentCall.refuse();
            currentCall = null;
        } catch (Exception e) {
            Log.w(TAG, "reject() chyba", e);
        }
        currentCallId = "";

        JSObject result = new JSObject();
        result.put("status", "rejected");
        call.resolve(result);
        notifyListeners("callEnded", result);
    }

    // ─── hangup ──────────────────────────────────────────────────────────────

    @PluginMethod
    public void hangup(PluginCall call) {
        int dur = 0;
        if (currentCall != null) {
            dur = callStartMs > 0
                ? (int)((System.currentTimeMillis() - callStartMs) / 1000) : 0;
            try { currentCall.hangup(); } catch (Exception e) { Log.w(TAG, "hangup err", e); }
            addHistoryRecord(currentCallId, "inbound", "ended", dur);
            currentCall = null;
        }
        currentCallId = "";
        callStartMs = 0;
        restoreAudio();

        JSObject result = new JSObject();
        result.put("status",   "hangup");
        result.put("duration", dur);
        call.resolve(result);
        notifyListeners("callEnded", result);
    }

    // ─── mute ────────────────────────────────────────────────────────────────

    @PluginMethod
    public void mute(PluginCall call) {
        boolean shouldMute = Boolean.TRUE.equals(call.getBoolean("muted", true));
        isMuted = shouldMute;
        if (audioManager != null) audioManager.setMicrophoneMute(shouldMute);

        JSObject result = new JSObject();
        result.put("muted", isMuted);
        call.resolve(result);
        notifyListeners("muteChanged", result);
    }

    // ─── setSpeaker ──────────────────────────────────────────────────────────

    @PluginMethod
    public void setSpeaker(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        isSpeaker = on;
        if (audioManager != null) {
            audioManager.setSpeakerphoneOn(on);
        }

        JSObject result = new JSObject();
        result.put("speaker", isSpeaker);
        call.resolve(result);
    }

    // ─── getCallHistory ───────────────────────────────────────────────────────

    @PluginMethod
    public void getCallHistory(PluginCall call) {
        JSArray arr = new JSArray();
        synchronized (callHistory) {
            for (JSObject r : callHistory) arr.put(r);
        }
        JSObject result = new JSObject();
        result.put("calls", arr);
        call.resolve(result);
    }

    // ─── CallListener — příchozí hovor od Asterisku ───────────────────────────

    @Override
    public void onCallIncoming(Call incomingCall, NameAddress callee,
                               NameAddress caller, String sdp, Message msg) {
        currentCall = incomingCall;
        currentCallId = extractCallId(msg);

        String callerId = (caller != null && caller.getAddress() != null)
            ? caller.getAddress().getUserName()
            : "Neznámé číslo";
        String callerDisplay = (caller != null && caller.getDisplayName() != null)
            ? caller.getDisplayName()
            : callerId;
        lastCallerId = callerId;

        Log.d(TAG, "Příchozí hovor od: " + callerId);

        // Spustí foreground service s notifikací (Přijmout / Odmítnout na lock screenu)
        startCallService(callerDisplay, "incoming");

        JSObject event = new JSObject();
        event.put("caller",     callerId);
        event.put("callerId",   callerId);   // alias pro JS
        event.put("callerName", callerDisplay);
        event.put("callId",     currentCallId);
        notifyListeners("incomingCall", event, true);
    }

    @Override
    public void onCallClosing(Call call, Message msg) {
        int dur = callStartMs > 0
            ? (int)((System.currentTimeMillis() - callStartMs) / 1000) : 0;
        if (currentCall != null) {
            addHistoryRecord(currentCallId, "inbound", "ended", dur);
        }
        currentCall = null;
        currentCallId = "";
        callStartMs = 0;
        restoreAudio();
        stopCallService();

        JSObject event = new JSObject();
        event.put("status",   "ended");
        event.put("duration", dur);
        notifyListeners("callEnded", event);
    }

    // ─── Audio ───────────────────────────────────────────────────────────────

    private void setupAudioForCall() {
        if (audioManager == null) return;
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        audioManager.setSpeakerphoneOn(false);
        audioManager.setMicrophoneMute(false);
        isMuted   = false;
        isSpeaker = false;
    }

    private void restoreAudio() {
        if (audioManager == null) return;
        audioManager.setMode(AudioManager.MODE_NORMAL);
        audioManager.setSpeakerphoneOn(false);
        audioManager.setMicrophoneMute(false);
        isMuted   = false;
        isSpeaker = false;
    }

    private SessionDescriptor buildAnswerSdp() {
        return new SessionDescriptor(
            "IN IP4 0.0.0.0",
            "NexusHub",
            "0 0 IN IP4 0.0.0.0",
            "m=audio 8000 RTP/AVP 0\r\na=rtpmap:0 PCMU/8000\r\na=sendrecv"
        );
    }

    // ─── Historie ────────────────────────────────────────────────────────────

    private void addHistoryRecord(String id, String dir, String status, int duration) {
        JSObject r = new JSObject();
        r.put("callId",    id != null ? id : "");
        r.put("caller",    ""); // doplní se z incomingCall handleru
        r.put("direction", dir);
        r.put("status",    status);
        r.put("duration",  duration);
        r.put("startedAt", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
            .format(new Date()));
        synchronized (callHistory) {
            callHistory.add(0, r);
            if (callHistory.size() > 200) callHistory.remove(callHistory.size() - 1);
        }
    }

    // ─── Ostatní CallListener metody ─────────────────────────────────────────

    @Override
    public void onCallModifying(Call c, String sdp, Message m) {
        Log.d(TAG, "onCallModifying");
    }

    @Override
    public void onCallRinging(Call c, Message m) {
        Log.d(TAG, "onCallRinging");
    }

    @Override
    public void onCallAccepted(Call c, String sdp, Message m) {
        Log.d(TAG, "onCallAccepted");
        callStartMs = System.currentTimeMillis();
        JSObject ev = new JSObject();
        ev.put("status", "accepted");
        notifyListeners("callAnswered", ev);
    }

    @Override
    public void onCallRefused(Call c, String reason, Message m) {
        Log.d(TAG, "onCallRefused: " + reason);
        currentCall = null;
        currentCallId = "";
        restoreAudio();
        JSObject ev = new JSObject();
        ev.put("status", "refused");
        ev.put("reason", reason);
        notifyListeners("callEnded", ev);
    }

    @Override
    public void onCallRedirection(Call c, String reason, Vector contacts, Message m) {
        Log.d(TAG, "onCallRedirection: " + reason);
    }

    @Override
    public void onCallConfirmed(Call c, String sdp, Message m) {
        Log.d(TAG, "onCallConfirmed");
    }

    @Override
    public void onCallTimeout(Call c) {
        Log.d(TAG, "onCallTimeout");
        if (currentCall != null) {
            addHistoryRecord(currentCallId, "inbound", "missed", 0);
        }
        currentCall = null;
        currentCallId = "";
        restoreAudio();
        JSObject ev = new JSObject();
        ev.put("status", "timeout");
        notifyListeners("callEnded", ev);
    }

    @Override
    public void onCallReInviteAccepted(Call c, String sdp, Message m) {
        Log.d(TAG, "onCallReInviteAccepted");
    }

    @Override
    public void onCallReInviteRefused(Call c, String reason, Message m) {
        Log.d(TAG, "onCallReInviteRefused: " + reason);
    }

    @Override
    public void onCallReInviteTimeout(Call c) {
        Log.d(TAG, "onCallReInviteTimeout");
    }

    @Override
    public void onCallCanceling(Call c, Message m) {
        if (currentCall != null) {
            addHistoryRecord(currentCallId, "inbound", "missed", 0);
        }
        currentCall = null;
        currentCallId = "";
        JSObject ev = new JSObject();
        ev.put("status", "cancelled");
        notifyListeners("callEnded", ev);
    }

    @Override
    public void onCallClosed(Call c, Message m) {
        currentCall = null;
        currentCallId = "";
        callStartMs = 0;
        restoreAudio();
        stopCallService();
    }

    private String extractCallId(Message msg) {
        try {
            if (msg != null && msg.getCallIdHeader() != null && msg.getCallIdHeader().getCallId() != null) {
                return msg.getCallIdHeader().getCallId();
            }
        } catch (Exception ignored) {
        }
        return UUID.randomUUID().toString();
    }
}
