package com.nexushub.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.telecom.TelecomManager;
import android.util.Log;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;

/**
 * NexusInCallPlugin — Capacitor plugin
 *
 * Propojuje NexusInCallService (Java) s JavaScript/React vrstvou.
 *
 * JS API:
 *   NexusInCall.isDefaultDialer()              → { isDefault: boolean }
 *   NexusInCall.requestDefaultDialer()         → void (otevře systémový dialog)
 *   NexusInCall.answer()                       → void
 *   NexusInCall.reject()                       → void
 *   NexusInCall.hangup()                       → void
 *   NexusInCall.setMuted({ muted: boolean })   → void
 *   NexusInCall.setSpeaker({ enabled: boolean }) → void
 *   NexusInCall.applyRemoteAnswer({ sdp: string }) → void
 *   NexusInCall.addIceCandidate({ sdpMid, sdpMLineIndex, candidate }) → void
 *
 * Events (addListener):
 *   "incomingGsmCall"  → { callerId, callId, state }
 *   "callStateChanged" → { state: 'ringing'|'active'|'holding'|'ended' }
 *   "webrtcOffer"      → { sdp, callerId }  (offer pro prohlížeč)
 *   "iceCandidate"     → { sdpMid, sdpMLineIndex, candidate }
 */
@RequiresApi(api = Build.VERSION_CODES.M)
@CapacitorPlugin(
    name = "NexusInCall",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone"),
        @Permission(strings = { Manifest.permission.CALL_PHONE },   alias = "call")
    }
)
public class NexusInCallPlugin extends Plugin {

    private static final String TAG = "NexusInCallPlugin";

    private static NexusInCallPlugin instance;
    public static NexusInCallPlugin getInstance() { return instance; }

    private boolean isGsmBridgeEnabled() {
        return BuildConfig.ENABLE_GSM_CALL_BRIDGE;
    }

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "NexusInCallPlugin načten");
    }

    // ─── PluginMethods (volatelné z JS) ──────────────────────────────────────

    /**
     * Zjistí, zda je Nexus nastaven jako výchozí telefonní aplikace.
     */
    @PluginMethod
    public void isDefaultDialer(PluginCall call) {
        boolean enabled = isGsmBridgeEnabled();
        boolean isDefault = enabled && NexusInCallService.isDefaultDialer(getContext());
        JSObject result = new JSObject();
        result.put("isDefault", isDefault);
        result.put("featureEnabled", enabled);
        call.resolve(result);
    }

    /**
     * Otevře systémový dialog pro nastavení Nexusu jako výchozí telefonní aplikace.
     */
    @PluginMethod
    public void requestDefaultDialer(PluginCall call) {
        if (!isGsmBridgeEnabled()) {
            call.reject("GSM call bridge is disabled for this build");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            android.app.role.RoleManager rm = getContext().getSystemService(android.app.role.RoleManager.class);
            if (rm != null && !rm.isRoleHeld(android.app.role.RoleManager.ROLE_DIALER)) {
                android.content.Intent intent = rm.createRequestRoleIntent(android.app.role.RoleManager.ROLE_DIALER);
                startActivityForResult(call, intent, "requestDefaultDialerCallback");
                return;
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.content.Intent intent = new android.content.Intent(android.telecom.TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
            intent.putExtra(android.telecom.TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getContext().getPackageName());
            startActivityForResult(call, intent, "requestDefaultDialerCallback");
            return;
        }
        call.resolve();
    }

    @ActivityCallback
    private void requestDefaultDialerCallback(PluginCall call, ActivityResult result) {
        call.resolve();
    }

    /**
     * Přijme aktivní příchozí hovor.
     */
    @PluginMethod
    public void answer(PluginCall call) {
        if (!isGsmBridgeEnabled()) {
            call.reject("GSM call bridge is disabled for this build");
            return;
        }
        NexusInCallService service = NexusInCallService.getInstance();
        if (service == null) {
            call.reject("InCallService není aktivní");
            return;
        }
        service.answer();
        call.resolve();
    }

    /**
     * Odmítne příchozí hovor.
     */
    @PluginMethod
    public void reject(PluginCall call) {
        if (!isGsmBridgeEnabled()) {
            call.reject("GSM call bridge is disabled for this build");
            return;
        }
        NexusInCallService service = NexusInCallService.getInstance();
        if (service == null) {
            call.reject("InCallService není aktivní");
            return;
        }
        service.reject();
        call.resolve();
    }

    /**
     * Zavěsí aktivní hovor.
     */
    @PluginMethod
    public void hangup(PluginCall call) {
        if (!isGsmBridgeEnabled()) {
            call.reject("GSM call bridge is disabled for this build");
            return;
        }
        NexusInCallService service = NexusInCallService.getInstance();
        if (service == null) {
            call.reject("InCallService není aktivní");
            return;
        }
        service.hangup();
        call.resolve();
    }

    /**
     * Ztlumí / odztlumí mikrofon.
     */
    @PluginMethod
    public void setMuted(PluginCall call) {
        boolean muted = Boolean.TRUE.equals(call.getBoolean("muted", false));
        NexusInCallService service = NexusInCallService.getInstance();
        if (service != null) service.muteAudio(muted);
        call.resolve();
    }

    /**
     * Přepne na reproduktor / sluchátko.
     */
    @PluginMethod
    public void setSpeaker(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        NexusInCallService service = NexusInCallService.getInstance();
        if (service != null) service.setSpeaker(enabled);
        call.resolve();
    }

    /**
     * Aplikuje SDP answer přijatý z prohlížeče operátora přes server.
     */
    @PluginMethod
    public void applyRemoteAnswer(PluginCall call) {
        String sdp = call.getString("sdp");
        if (sdp == null) {
            call.reject("Chybí parametr 'sdp'");
            return;
        }
        NexusInCallService service = NexusInCallService.getInstance();
        if (service != null) service.applyRemoteAnswer(sdp);
        call.resolve();
    }

    /**
     * Přidá ICE kandidáta přijatého z prohlížeče.
     */
    @PluginMethod
    public void addIceCandidate(PluginCall call) {
        String sdpMid = call.getString("sdpMid", "");
        Integer sdpMLineIndex = call.getInt("sdpMLineIndex", 0);
        String candidate = call.getString("candidate", "");
        NexusInCallService service = NexusInCallService.getInstance();
        if (service != null) service.addIceCandidate(sdpMid, sdpMLineIndex, candidate);
        call.resolve();
    }

    // ─── Metody volané z NexusInCallService → notifikují JS ──────────────────

    /**
     * Voláno z NexusInCallService.onCallAdded() — oznámí příchozí hovor do JS.
     */
    public void notifyIncomingCall(JSObject event) {
        notifyListeners("incomingGsmCall", event, true);
        Log.d(TAG, "JS notifikován: incomingGsmCall → " + event.toString());
    }

    /**
     * Voláno při změně stavu hovoru (ringing → active → ended).
     */
    public void notifyCallStateChange(JSObject event) {
        notifyListeners("callStateChanged", event, true);
    }

    /**
     * Voláno z NexusInCallService po vytvoření WebRTC offer.
     * Posílá SDP offer do JS, který ho přepošle přes Socket.IO na server.
     */
    public void sendWebRtcOffer(String sdp, String callerId) {
        JSObject event = new JSObject();
        event.put("sdp", sdp);
        event.put("callerId", callerId);
        notifyListeners("webrtcOffer", event, true);
        Log.d(TAG, "WebRTC offer odeslán do JS");
    }

    /**
     * Voláno z NexusInCallService při ICE kandidátu.
     */
    public void sendIceCandidate(String sdpMid, int sdpMLineIndex, String candidate) {
        JSObject event = new JSObject();
        event.put("sdpMid", sdpMid);
        event.put("sdpMLineIndex", sdpMLineIndex);
        event.put("candidate", candidate);
        notifyListeners("iceCandidate", event, true);
    }
}
