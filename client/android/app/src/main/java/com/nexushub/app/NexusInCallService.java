package com.nexushub.app;

import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.telecom.Call;
import android.telecom.InCallService;
import android.telecom.VideoProfile;
import android.util.Log;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;

import org.webrtc.AudioSource;
import org.webrtc.AudioTrack;
import org.webrtc.DefaultVideoDecoderFactory;
import org.webrtc.DefaultVideoEncoderFactory;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.MediaConstraints;
import org.webrtc.MediaStream;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.RtpSender;
import org.webrtc.SdpObserver;
import org.webrtc.SessionDescription;

import java.util.ArrayList;
import java.util.List;

/**
 * NexusInCallService
 *
 * Android InCallService implementace umožňující Nexusu interceptovat příchozí GSM hovory
 * a přemostit audio přes WebRTC do prohlížeče operátora — bez potřeby externího SIP Trunk.
 *
 * Požadavky:
 *   1. Uživatel musí nastavit Nexus jako výchozí telefonní aplikaci (jednorázově).
 *   2. Manifest musí deklarovat android.telecom.InCallService s BIND_INCALL_SERVICE.
 *   3. WebRTC AAR musí být v build.gradle (io.github.webrtc-sdk:android).
 *
 * Tok:
 *   GSM hovor přijde → onCallAdded() → JS event "incomingGsmCall"
 *   Operátor klikne Přijmout → answer() → INVITE/WebRTC offer → prohlížeč odpoví
 *   Operátor zavěsí → hangup() → hovor ukončen
 */
@RequiresApi(api = Build.VERSION_CODES.M)
public class NexusInCallService extends InCallService {

    private static final String TAG = "NexusInCallService";

    // Singleton přístup z NexusInCallPlugin
    private static NexusInCallService instance;
    public static NexusInCallService getInstance() { return instance; }

    // Aktivní GSM hovor (android.telecom.Call)
    private Call activeCall;
    private Call.Callback callCallback;

    // WebRTC
    private PeerConnectionFactory peerConnectionFactory;
    private PeerConnection peerConnection;
    private AudioSource audioSource;
    private AudioTrack localAudioTrack;
    private EglBase eglBase;

    // Audio manager
    private AudioManager audioManager;
    private int savedAudioMode;
    private boolean savedSpeakerphone;

    // Handler pro UI thread
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        initWebRtc();
        Log.d(TAG, "NexusInCallService spuštěn");
    }

    @Override
    public void onDestroy() {
        releaseWebRtc();
        instance = null;
        super.onDestroy();
        Log.d(TAG, "NexusInCallService ukončen");
    }

    // ─── InCallService callbacks ──────────────────────────────────────────────

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        Log.d(TAG, "onCallAdded: " + call.getState());

        activeCall = call;

        // Zaregistruj listener na změny stavu hovoru
        callCallback = new Call.Callback() {
            @Override
            public void onStateChanged(Call c, int state) {
                Log.d(TAG, "Call state changed: " + state);
                handleCallStateChange(c, state);
            }

            @Override
            public void onCallDestroyed(Call c) {
                Log.d(TAG, "Call destroyed");
                notifyCallEnded();
                activeCall = null;
            }
        };
        call.registerCallback(callCallback);

        // Extrahuj informace o volajícím
        String callerId = "Neznámé číslo";
        if (call.getDetails() != null && call.getDetails().getHandle() != null) {
            callerId = call.getDetails().getHandle().getSchemeSpecificPart();
        }

        // Notifikuj JavaScript (NexusInCallPlugin → React)
        final String finalCallerId = callerId;
        mainHandler.post(() -> {
            NexusInCallPlugin plugin = NexusInCallPlugin.getInstance();
            if (plugin != null) {
                JSObject event = new JSObject();
                event.put("callerId", finalCallerId);
                event.put("callId", call.toString());
                event.put("state", "ringing");
                plugin.notifyIncomingCall(event);
                Log.d(TAG, "JS notifikován o příchozím hovoru: " + finalCallerId);
            }
        });
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        if (call.equals(activeCall)) {
            if (callCallback != null) {
                call.unregisterCallback(callCallback);
                callCallback = null;
            }
            activeCall = null;
            notifyCallEnded();
        }
    }

    // ─── Veřejné metody (volané z NexusInCallPlugin) ─────────────────────────

    /**
     * Zvedne aktivní GSM hovor.
     * Volá se z JS přes NexusInCallPlugin.answer()
     */
    public void answer() {
        if (activeCall == null) {
            Log.w(TAG, "answer(): žádný aktivní hovor");
            return;
        }
        setupAudio();
        activeCall.answer(VideoProfile.STATE_AUDIO_ONLY);
        Log.d(TAG, "Hovor přijat");
    }

    /**
     * Odmítne příchozí hovor.
     */
    public void reject() {
        if (activeCall == null) {
            Log.w(TAG, "reject(): žádný aktivní hovor");
            return;
        }
        activeCall.reject(false, null);
        restoreAudio();
        Log.d(TAG, "Hovor odmítnut");
    }

    /**
     * Zavěsí aktivní hovor.
     */
    public void hangup() {
        if (activeCall == null) {
            Log.w(TAG, "hangup(): žádný aktivní hovor");
            return;
        }
        activeCall.disconnect();
        restoreAudio();
        Log.d(TAG, "Hovor ukončen");
    }

    /**
     * Ztlumí / odztlumí mikrofon.
     * Poznámka: nemůžeme přepsat setMuted() — je final v InCallService.
     * Voláme přímo zděděnou metodu InCallService.setMuted().
     */
    public void muteAudio(boolean muted) {
        // Inherited final method from InCallService — správné API pro mute v Telecom stacku
        setMuted(muted);
        if (audioManager != null) {
            audioManager.setMicrophoneMute(muted);
        }
    }

    /**
     * Přepne na reproduktor / sluchátko.
     */
    public void setSpeaker(boolean speaker) {
        if (audioManager != null) {
            audioManager.setSpeakerphoneOn(speaker);
        }
    }

    // ─── WebRTC signaling: odesílání SDP offer operátorovi ───────────────────

    /**
     * Vytvoří WebRTC PeerConnection a odešle SDP offer přes Socket.IO na server,
     * který ho přepošle operátorovi v prohlížeči.
     *
     * Volá se po přijetí hovoru (answer()).
     */
    public void createAndSendOffer(String callerId) {
        if (peerConnection == null) {
            Log.w(TAG, "createAndSendOffer: peerConnection je null");
            return;
        }

        MediaConstraints constraints = new MediaConstraints();
        constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"));
        constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveVideo", "false"));

        peerConnection.createOffer(new SdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription sdp) {
                peerConnection.setLocalDescription(new SdpObserver() {
                    @Override public void onCreateSuccess(SessionDescription sd) {}
                    @Override public void onSetSuccess() {
                        // Odešli offer přes NexusInCallPlugin → Socket.IO → server → prohlížeč
                        mainHandler.post(() -> {
                            NexusInCallPlugin plugin = NexusInCallPlugin.getInstance();
                            if (plugin != null) {
                                plugin.sendWebRtcOffer(sdp.description, callerId);
                            }
                        });
                    }
                    @Override public void onCreateFailure(String err) {}
                    @Override public void onSetFailure(String err) {
                        Log.e(TAG, "setLocalDescription failed: " + err);
                    }
                }, sdp);
            }
            @Override public void onSetSuccess() {}
            @Override public void onCreateFailure(String err) {
                Log.e(TAG, "createOffer failed: " + err);
            }
            @Override public void onSetFailure(String err) {}
        }, constraints);
    }

    /**
     * Aplikuje SDP answer přijatý z prohlížeče operátora.
     */
    public void applyRemoteAnswer(String sdpAnswer) {
        if (peerConnection == null) return;
        SessionDescription answer = new SessionDescription(SessionDescription.Type.ANSWER, sdpAnswer);
        peerConnection.setRemoteDescription(new SdpObserver() {
            @Override public void onCreateSuccess(SessionDescription sd) {}
            @Override public void onSetSuccess() {
                Log.d(TAG, "Remote answer aplikován — WebRTC spojení aktivní");
            }
            @Override public void onCreateFailure(String err) {}
            @Override public void onSetFailure(String err) {
                Log.e(TAG, "setRemoteDescription failed: " + err);
            }
        }, answer);
    }

    /**
     * Přidá ICE kandidáta z prohlížeče.
     */
    public void addIceCandidate(String sdpMid, int sdpMLineIndex, String candidate) {
        if (peerConnection == null) return;
        peerConnection.addIceCandidate(new IceCandidate(sdpMid, sdpMLineIndex, candidate));
    }

    // ─── Interní: WebRTC inicializace ─────────────────────────────────────────

    private void initWebRtc() {
        eglBase = EglBase.create();

        PeerConnectionFactory.InitializationOptions initOptions =
            PeerConnectionFactory.InitializationOptions.builder(this)
                .setEnableInternalTracer(false)
                .createInitializationOptions();
        PeerConnectionFactory.initialize(initOptions);

        PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setOptions(options)
            .setVideoEncoderFactory(new DefaultVideoEncoderFactory(eglBase.getEglBaseContext(), true, true))
            .setVideoDecoderFactory(new DefaultVideoDecoderFactory(eglBase.getEglBaseContext()))
            .createPeerConnectionFactory();

        // ICE servery — STUN od Google (veřejně dostupné, pro NAT traversal)
        List<PeerConnection.IceServer> iceServers = new ArrayList<>();
        iceServers.add(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer());
        iceServers.add(PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer());

        PeerConnection.RTCConfiguration rtcConfig = new PeerConnection.RTCConfiguration(iceServers);
        rtcConfig.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN;

        peerConnection = peerConnectionFactory.createPeerConnection(rtcConfig, new PeerConnection.Observer() {
            @Override
            public void onIceCandidate(IceCandidate candidate) {
                // Odešli ICE kandidáta do prohlížeče
                mainHandler.post(() -> {
                    NexusInCallPlugin plugin = NexusInCallPlugin.getInstance();
                    if (plugin != null) {
                        plugin.sendIceCandidate(candidate.sdpMid, candidate.sdpMLineIndex, candidate.sdp);
                    }
                });
            }
            @Override public void onSignalingChange(PeerConnection.SignalingState s) {}
            @Override public void onIceConnectionChange(PeerConnection.IceConnectionState s) {
                Log.d(TAG, "ICE state: " + s);
            }
            @Override public void onIceGatheringChange(PeerConnection.IceGatheringState s) {}
            @Override public void onAddStream(MediaStream stream) {}
            @Override public void onRemoveStream(MediaStream stream) {}
            @Override public void onDataChannel(org.webrtc.DataChannel dc) {}
            @Override public void onRenegotiationNeeded() {}
            @Override public void onIceCandidatesRemoved(IceCandidate[] candidates) {}
            @Override public void onAddTrack(org.webrtc.RtpReceiver receiver, MediaStream[] streams) {}
            @Override public void onConnectionChange(PeerConnection.PeerConnectionState state) {
                Log.d(TAG, "PeerConnection state: " + state);
            }
            @Override public void onIceConnectionReceivingChange(boolean receiving) {}
        });

        // Přidej audio track (mikrofon telefonu → WebRTC stream)
        MediaConstraints audioConstraints = new MediaConstraints();
        audioConstraints.mandatory.add(new MediaConstraints.KeyValuePair("echoCancellation", "true"));
        audioConstraints.mandatory.add(new MediaConstraints.KeyValuePair("noiseSuppression", "true"));
        audioSource = peerConnectionFactory.createAudioSource(audioConstraints);
        localAudioTrack = peerConnectionFactory.createAudioTrack("nexus_audio_0", audioSource);
        localAudioTrack.setEnabled(true);

        if (peerConnection != null) {
            peerConnection.addTrack(localAudioTrack);
        }

        Log.d(TAG, "WebRTC inicializován");
    }

    private void releaseWebRtc() {
        if (peerConnection != null) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localAudioTrack != null) {
            localAudioTrack.dispose();
            localAudioTrack = null;
        }
        if (audioSource != null) {
            audioSource.dispose();
            audioSource = null;
        }
        if (peerConnectionFactory != null) {
            peerConnectionFactory.dispose();
            peerConnectionFactory = null;
        }
        if (eglBase != null) {
            eglBase.release();
            eglBase = null;
        }
    }

    // ─── Interní: Audio management ────────────────────────────────────────────

    private void setupAudio() {
        if (audioManager == null) return;
        savedAudioMode = audioManager.getMode();
        savedSpeakerphone = audioManager.isSpeakerphoneOn();
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        audioManager.setSpeakerphoneOn(false);
        audioManager.setMicrophoneMute(false);
    }

    private void restoreAudio() {
        if (audioManager == null) return;
        audioManager.setMode(savedAudioMode);
        audioManager.setSpeakerphoneOn(savedSpeakerphone);
        audioManager.setMicrophoneMute(false);
    }

    // ─── Interní: Stav hovoru ─────────────────────────────────────────────────

    private void handleCallStateChange(Call call, int state) {
        mainHandler.post(() -> {
            NexusInCallPlugin plugin = NexusInCallPlugin.getInstance();
            if (plugin == null) return;

            String stateStr;
            switch (state) {
                case Call.STATE_RINGING:     stateStr = "ringing";     break;
                case Call.STATE_ACTIVE:      stateStr = "active";      break;
                case Call.STATE_HOLDING:     stateStr = "holding";     break;
                case Call.STATE_DISCONNECTED: stateStr = "ended";       break;
                case Call.STATE_DIALING:     stateStr = "dialing";     break;
                default:                     stateStr = "unknown";     break;
            }

            JSObject event = new JSObject();
            event.put("state", stateStr);
            plugin.notifyCallStateChange(event);

            // Po přijetí hovoru vytvoř WebRTC offer
            if (state == Call.STATE_ACTIVE) {
                String callerId = "unknown";
                if (call.getDetails() != null && call.getDetails().getHandle() != null) {
                    callerId = call.getDetails().getHandle().getSchemeSpecificPart();
                }
                createAndSendOffer(callerId);
            }

            // Po ukončení hovoru resetuj audio
            if (state == Call.STATE_DISCONNECTED) {
                restoreAudio();
            }
        });
    }

    private void notifyCallEnded() {
        mainHandler.post(() -> {
            NexusInCallPlugin plugin = NexusInCallPlugin.getInstance();
            if (plugin != null) {
                JSObject event = new JSObject();
                event.put("state", "ended");
                plugin.notifyCallStateChange(event);
            }
        });
        restoreAudio();
    }

    // ─── Statická helper metoda: zjisti, zda je Nexus výchozí telefonní app ──

    /**
     * Vrátí true, pokud je Nexus nastaven jako výchozí telefonní aplikace.
     * Používá se v RelayMode UI pro zobrazení instrukce nastavení.
     */
    public static boolean isDefaultDialer(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        android.telecom.TelecomManager tm =
            (android.telecom.TelecomManager) context.getSystemService(Context.TELECOM_SERVICE);
        if (tm == null) return false;
        return context.getPackageName().equals(tm.getDefaultDialerPackage());
    }

    /**
     * Otevře systémový dialog pro nastavení Nexusu jako výchozí telefonní aplikace.
     */
    public static void requestDefaultDialer(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        Intent intent = new Intent(android.telecom.TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
        intent.putExtra(android.telecom.TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME,
            context.getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }
}
