package com.nexushub.app;

import android.Manifest;
import android.content.Context;
import android.os.Build;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NexusRelay",
    permissions = {
        @Permission(alias = NexusRelayPlugin.SMS_PERMISSION_ALIAS, strings = { Manifest.permission.RECEIVE_SMS }),
        @Permission(alias = NexusRelayPlugin.PHONE_PERMISSION_ALIAS, strings = { Manifest.permission.READ_PHONE_STATE })
    }
)
public class NexusRelayPlugin extends Plugin {
    static final String SMS_PERMISSION_ALIAS = "sms";
    static final String PHONE_PERMISSION_ALIAS = "phone";

    public static NexusRelayPlugin instance;
    private NexusPhoneListener phoneListener;
    private TelephonyCallback telephonyCallback;
    private TelephonyManager telephonyManager;

    @Override
    public void load() {
        super.load();
        instance = this;

        telephonyManager = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
        maybeRegisterCallStateListener();
    }

    @Override
    protected void handleOnDestroy() {
        unregisterCallStateListener();
        telephonyManager = null;
        if (instance == this) {
            instance = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void ensureReady(PluginCall call) {
        if (hasAllRequiredPermissions()) {
            maybeRegisterCallStateListener();
            call.resolve(buildStatus());
            return;
        }

        requestPermissionForAliases(getMissingPermissionAliases(), call, "permissionsReadyCallback");
    }

    @PermissionCallback
    private void permissionsReadyCallback(PluginCall call) {
        if (getPermissionState(PHONE_PERMISSION_ALIAS) == PermissionState.GRANTED) {
            maybeRegisterCallStateListener();
        } else {
            unregisterCallStateListener();
        }
        call.resolve(buildStatus());
    }

    private boolean hasAllRequiredPermissions() {
        return getPermissionState(SMS_PERMISSION_ALIAS) == PermissionState.GRANTED &&
            getPermissionState(PHONE_PERMISSION_ALIAS) == PermissionState.GRANTED;
    }

    private String[] getMissingPermissionAliases() {
        boolean needsSms = getPermissionState(SMS_PERMISSION_ALIAS) != PermissionState.GRANTED;
        boolean needsPhone = getPermissionState(PHONE_PERMISSION_ALIAS) != PermissionState.GRANTED;

        if (needsSms && needsPhone) {
            return new String[] { SMS_PERMISSION_ALIAS, PHONE_PERMISSION_ALIAS };
        }
        if (needsSms) {
            return new String[] { SMS_PERMISSION_ALIAS };
        }
        if (needsPhone) {
            return new String[] { PHONE_PERMISSION_ALIAS };
        }
        return new String[0];
    }

    private JSObject buildStatus() {
        JSObject status = new JSObject();
        PermissionState smsState = getPermissionState(SMS_PERMISSION_ALIAS);
        PermissionState phoneState = getPermissionState(PHONE_PERMISSION_ALIAS);
        status.put(SMS_PERMISSION_ALIAS, smsState.toString());
        status.put(PHONE_PERMISSION_ALIAS, phoneState.toString());
        status.put("ready", smsState == PermissionState.GRANTED && phoneState == PermissionState.GRANTED);
        status.put("callMonitoring", phoneState == PermissionState.GRANTED);
        status.put("smsMonitoring", smsState == PermissionState.GRANTED);
        return status;
    }

    private void maybeRegisterCallStateListener() {
        if (telephonyManager == null || getPermissionState(PHONE_PERMISSION_ALIAS) != PermissionState.GRANTED) {
            return;
        }
        registerCallStateListener();
    }

    private void registerCallStateListener() {
        if (telephonyManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (telephonyCallback != null) {
                return;
            }
            telephonyCallback = new NexusCallStateCallback();
            telephonyManager.registerTelephonyCallback(getContext().getMainExecutor(), telephonyCallback);
            return;
        }

        registerLegacyCallStateListener();
    }

    private void unregisterCallStateListener() {
        if (telephonyManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (telephonyCallback != null) {
                telephonyManager.unregisterTelephonyCallback(telephonyCallback);
                telephonyCallback = null;
            }
            return;
        }

        unregisterLegacyCallStateListener();
    }

    @SuppressWarnings("deprecation")
    private void registerLegacyCallStateListener() {
        if (phoneListener != null) {
            return;
        }
        phoneListener = new NexusPhoneListener();
        telephonyManager.listen(phoneListener, PhoneStateListener.LISTEN_CALL_STATE);
    }

    @SuppressWarnings("deprecation")
    private void unregisterLegacyCallStateListener() {
        if (phoneListener != null) {
            telephonyManager.listen(phoneListener, PhoneStateListener.LISTEN_NONE);
            phoneListener = null;
        }
    }

    public static void onMessageReceived(String from, String body) {
        if (instance == null) return;
        JSObject ret = new JSObject();
        ret.put("from", from);
        ret.put("body", body);
        instance.notifyListeners("onSmsReceived", ret, true);
    }

    public static void onCallStateChanged(String from, String state) {
        if (instance == null) return;
        JSObject ret = new JSObject();
        ret.put("from", from);
        ret.put("state", state);
        instance.notifyListeners("onCallStateChanged", ret, true);
    }

    static String toCallStateString(int state) {
        if (state == TelephonyManager.CALL_STATE_RINGING) return "RINGING";
        if (state == TelephonyManager.CALL_STATE_OFFHOOK) return "OFFHOOK";
        return "IDLE";
    }

    private static class NexusCallStateCallback extends TelephonyCallback implements TelephonyCallback.CallStateListener {
        @Override
        public void onCallStateChanged(int state) {
            NexusRelayPlugin.onCallStateChanged(null, NexusRelayPlugin.toCallStateString(state));
        }
    }
}
