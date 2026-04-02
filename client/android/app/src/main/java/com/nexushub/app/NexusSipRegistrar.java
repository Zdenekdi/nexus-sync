package com.nexushub.app;

import android.util.Log;

import org.zoolu.sip.address.NameAddress;
import org.zoolu.sip.address.SipURL;
import org.zoolu.sip.call.Call;
import org.zoolu.sip.call.CallListener;
import org.zoolu.sip.provider.SipProvider;
import org.zoolu.sip.transaction.TransactionClient;
import org.zoolu.sip.header.AuthorizationHeader;
import org.zoolu.sip.header.ContactHeader;
import org.zoolu.sip.header.ExpiresHeader;
import org.zoolu.sip.header.CSeqHeader;
import org.zoolu.sip.header.CallIdHeader;
import org.zoolu.sip.header.ProxyAuthorizationHeader;
import org.zoolu.sip.message.Message;
import org.zoolu.sip.message.MessageFactory;
import org.zoolu.sip.message.SipMethods;
import org.zoolu.sip.transaction.TransactionClientListener;

import java.security.MessageDigest;
import java.util.UUID;

/**
 * NexusSipRegistrar
 *
 * Odesílá SIP REGISTER na Asterisk server a zpracovává
 * případnou 401/407 digest auth výzvu.
 *
 * Použití:
 *   NexusSipRegistrar r = new NexusSipRegistrar(provider, user, pass, domain, callListener);
 *   r.register();    // aktivní registrace (Expires: 3600)
 *   r.unregister();  // zruší registraci (Expires: 0)
 */
public class NexusSipRegistrar implements TransactionClientListener {

    private static final String TAG     = "NexusSipRegistrar";
    private static final int    EXPIRES = 3600;

    private final SipProvider  sipProvider;
    private final String       username;
    private final String       password;
    private final String       domain;
    private final CallListener callListener; // NexusSipPlugin

    private String  callId;
    private int     cseq = 1;
    private boolean active = false;

    // ── Constructor ──────────────────────────────────────────────────────────

    public NexusSipRegistrar(SipProvider sipProvider,
                             String username, String password,
                             String domain, CallListener callListener) {
        this.sipProvider  = sipProvider;
        this.username     = username;
        this.password     = password;
        this.domain       = domain;
        this.callListener = callListener;
        this.callId       = UUID.randomUUID().toString() + "@" + domain;
    }

    // ── Veřejné metody ───────────────────────────────────────────────────────

    /** Odešle REGISTER (Expires: 3600) */
    public void register() {
        active = true;
        sendRegister(EXPIRES, null, null, null);
    }

    /** Odešle REGISTER (Expires: 0) → deregistrace */
    public void unregister() {
        active = false;
        sendRegister(0, null, null, null);
    }

    // ── Interní posílání REGISTER ─────────────────────────────────────────────

    private void sendRegister(int expires,
                              String authHeaderName,
                              String realm,
                              String nonce) {
        try {
            String requestUri = "sip:" + domain;
            String fromUri    = "sip:" + username + "@" + domain;
            String toUri      = "sip:" + username + "@" + domain;
            String contactUri = "sip:" + username + "@" + sipProvider.getViaAddress()
                + ":" + sipProvider.getPort();

            NameAddress from = new NameAddress(fromUri);
            NameAddress to = new NameAddress(toUri);
            NameAddress contact = new NameAddress(contactUri);
            Message register = MessageFactory.createRegisterRequest(sipProvider, to, from, contact);

            register.setCallIdHeader(new CallIdHeader(callId));
            register.setCSeqHeader(new CSeqHeader(cseq++, SipMethods.REGISTER));
            register.setContactHeader(new ContactHeader(contact));
            register.setExpiresHeader(new ExpiresHeader(expires));

            // Digest auth pokud máme challenge
            if (authHeaderName != null && realm != null && nonce != null) {
                String ha1      = md5(username + ":" + realm + ":" + password);
                String ha2      = md5("REGISTER:" + requestUri);
                String response = md5(ha1 + ":" + nonce + ":" + ha2);

                String authValue = "Digest username=\"" + username
                    + "\",realm=\"" + realm
                    + "\",nonce=\"" + nonce
                    + "\",uri=\"" + requestUri
                    + "\",response=\"" + response + "\"";

                if ("Proxy-Authenticate".equalsIgnoreCase(authHeaderName)) {
                    register.setProxyAuthorizationHeader(new ProxyAuthorizationHeader(authValue));
                } else {
                    register.setAuthorizationHeader(new AuthorizationHeader(authValue));
                }
            }

            TransactionClient tx = new TransactionClient(sipProvider, register, this);
            tx.request();

            Log.d(TAG, "REGISTER odesláno → " + requestUri + " (expires=" + expires + ")");

        } catch (Exception e) {
            Log.e(TAG, "sendRegister selhalo", e);
        }
    }

    // ── TransactionClientListener ─────────────────────────────────────────────

    @Override
    public void onTransProvisionalResponse(TransactionClient tx, Message resp) {
        // 100 Trying — ignorujeme
    }

    @Override
    public void onTransSuccessResponse(TransactionClient tx, Message resp) {
        // 200 OK — registrace úspěšná
        Log.d(TAG, "REGISTER 200 OK → zaregistrováno jako " + username + "@" + domain);

        // Spuštění poslechu příchozích hovorů
        if (active && callListener != null) {
            try {
                Call listenCall = new Call(sipProvider, null, null, callListener);
                listenCall.listen();
                Log.d(TAG, "Naslouchání příchozím hovorům aktivováno");
            } catch (Exception e) {
                Log.e(TAG, "Chyba při spouštění listenCall", e);
            }
        }
    }

    @Override
    public void onTransFailureResponse(TransactionClient tx, Message resp) {
        int code = resp.getStatusLine().getCode();
        Log.d(TAG, "REGISTER response: " + code);

        if (code == 401 || code == 407) {
            // Digest auth výzva
            final String authHeaderName = code == 401 ? "WWW-Authenticate" : "Proxy-Authenticate";
            String wwwAuth = resp.getHeader(authHeaderName) != null
                ? resp.getHeader(authHeaderName).getValue() : null;

            if (wwwAuth == null) {
                Log.w(TAG, "Auth výzva bez WWW-Authenticate hlavičky");
                return;
            }

            String realm = parseAuthParam(wwwAuth, "realm");
            String nonce = parseAuthParam(wwwAuth, "nonce");

            Log.d(TAG, "Digest auth → realm=" + realm);
            sendRegister(active ? EXPIRES : 0, authHeaderName, realm, nonce);
        } else {
            Log.w(TAG, "REGISTER selhalo s kódem " + code);
        }
    }

    @Override
    public void onTransTimeout(TransactionClient tx) {
        Log.w(TAG, "REGISTER timeout — server nedostupný?");
    }


    // ── Pomocné metody ───────────────────────────────────────────────────────

    private String parseAuthParam(String header, String param) {
        int i = header.indexOf(param + "=\"");
        if (i < 0) return "";
        int s = i + param.length() + 2;
        int e = header.indexOf('"', s);
        return e < 0 ? "" : header.substring(s, e);
    }

    private String md5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] bytes = md.digest(input.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
