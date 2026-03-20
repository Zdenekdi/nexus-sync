package com.nexushub.app;

import android.Manifest;
import android.content.Context;
import android.os.Build;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import androidx.annotation.RequiresApi;
import java.nio.charset.StandardCharsets;
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
        @Permission(alias = NexusRelayPlugin.SMS_PERMISSION_ALIAS, strings = { Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS }),
        @Permission(alias = NexusRelayPlugin.PHONE_PERMISSION_ALIAS, strings = { Manifest.permission.READ_PHONE_STATE }),
        @Permission(alias = NexusRelayPlugin.LOCATION_PERMISSION_ALIAS, strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION })
    }
)
public class NexusRelayPlugin extends Plugin {
    static final String SMS_PERMISSION_ALIAS = "sms";
    static final String PHONE_PERMISSION_ALIAS = "phone";
    static final String LOCATION_PERMISSION_ALIAS = "location";

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
            getPermissionState(PHONE_PERMISSION_ALIAS) == PermissionState.GRANTED &&
            getPermissionState(LOCATION_PERMISSION_ALIAS) == PermissionState.GRANTED;
    }

    private String[] getMissingPermissionAliases() {
        java.util.List<String> missing = new java.util.ArrayList<>();
        if (getPermissionState(SMS_PERMISSION_ALIAS) != PermissionState.GRANTED) {
            missing.add(SMS_PERMISSION_ALIAS);
        }
        if (getPermissionState(PHONE_PERMISSION_ALIAS) != PermissionState.GRANTED) {
            missing.add(PHONE_PERMISSION_ALIAS);
        }
        if (getPermissionState(LOCATION_PERMISSION_ALIAS) != PermissionState.GRANTED) {
            missing.add(LOCATION_PERMISSION_ALIAS);
        }
        return missing.toArray(new String[0]);
    }

    private JSObject buildStatus() {
        JSObject status = new JSObject();
        PermissionState smsState = getPermissionState(SMS_PERMISSION_ALIAS);
        PermissionState phoneState = getPermissionState(PHONE_PERMISSION_ALIAS);
        PermissionState locationState = getPermissionState(LOCATION_PERMISSION_ALIAS);
        status.put(SMS_PERMISSION_ALIAS, smsState.toString());
        status.put(PHONE_PERMISSION_ALIAS, phoneState.toString());
        status.put(LOCATION_PERMISSION_ALIAS, locationState.toString());
        status.put("ready",
            smsState == PermissionState.GRANTED &&
            phoneState == PermissionState.GRANTED &&
            locationState == PermissionState.GRANTED);
        status.put("callMonitoring", phoneState == PermissionState.GRANTED);
        status.put("smsMonitoring", smsState == PermissionState.GRANTED);
        status.put("locationMonitoring", locationState == PermissionState.GRANTED);
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
        phoneListener = new NexusPhoneListener(getContext());
        telephonyManager.listen(phoneListener, PhoneStateListener.LISTEN_CALL_STATE);
    }

    @SuppressWarnings("deprecation")
    private void unregisterLegacyCallStateListener() {
        if (phoneListener != null) {
            telephonyManager.listen(phoneListener, PhoneStateListener.LISTEN_NONE);
            phoneListener = null;
        }
    }

    @PluginMethod
    public void configureRelay(PluginCall call) {
        String baseUrl = call.getString("baseUrl");
        String deviceId = call.getString("deviceId");
        Boolean isActive = call.getBoolean("isActive", false);

        Context context = getContext();
        android.content.SharedPreferences prefs = context.getSharedPreferences("NexusRelayPrefs", Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = prefs.edit();
        
        if (baseUrl != null) editor.putString("baseUrl", baseUrl);
        if (deviceId != null) editor.putString("deviceId", deviceId);
        editor.putBoolean("isActive", isActive != null && isActive);
        editor.apply();

        JSObject ret = buildStatus();
        ret.put("configUpdated", true);
        call.resolve(ret);
    }

    public static void onMessageReceived(Context context, String from, String body) {
        android.content.SharedPreferences prefs = context.getSharedPreferences("NexusRelayPrefs", Context.MODE_PRIVATE);
        boolean isActive = prefs.getBoolean("isActive", false);
        String baseUrl = prefs.getString("baseUrl", null);
        String deviceId = prefs.getString("deviceId", "RELAY-DEVICE");

        // 1. Notify JS (for UI logs if app is open)
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("from", from);
            ret.put("body", body);
            instance.notifyListeners("onSmsReceived", ret, true);
        }

        // 2. Native Background Forwarding
        if (isActive && baseUrl != null) {
            forwardDataNative(baseUrl, deviceId, "sms", from, body);
        }
    }

    public static void onCallStateChanged(Context context, String from, String state) {
        android.content.SharedPreferences prefs = context.getSharedPreferences("NexusRelayPrefs", Context.MODE_PRIVATE);
        boolean isActive = prefs.getBoolean("isActive", false);
        String baseUrl = prefs.getString("baseUrl", null);
        String deviceId = prefs.getString("deviceId", "RELAY-DEVICE");

        // 1. Notify JS
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("from", from);
            ret.put("state", state);
            instance.notifyListeners("onCallStateChanged", ret, true);
        }

        // 2. Native Background Forwarding
        if (isActive && baseUrl != null && state != null && !state.equals("IDLE")) {
            forwardDataNative(baseUrl, deviceId, "call", from, "State: " + state);
        }
    }

    private static void forwardDataNative(final String baseUrl, final String deviceId, final String type, final String from, final String content) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    java.net.URL url = new java.net.URL(baseUrl);
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(12000);
                    conn.setReadTimeout(12000);

                    org.json.JSONObject jsonParam = new org.json.JSONObject();
                    jsonParam.put("deviceId", deviceId);
                    jsonParam.put("type", type);
                    jsonParam.put("from", from);
                    jsonParam.put("content", content);
                    jsonParam.put("timestamp", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(new java.util.Date()));

                    try(java.io.OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonParam.toString().getBytes(StandardCharsets.UTF_8);
                        os.write(input, 0, input.length);			
                    }

                    int code = conn.getResponseCode();
                    android.util.Log.d("NexusRelay", "Native Forward Response Code: " + code);
                    if (code >= 400) {
                        java.io.InputStream errorStream = conn.getErrorStream();
                        if (errorStream != null) {
                            java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(errorStream, StandardCharsets.UTF_8));
                            StringBuilder responseBuilder = new StringBuilder();
                            String line;
                            while ((line = reader.readLine()) != null) {
                                responseBuilder.append(line);
                            }
                            reader.close();
                            android.util.Log.e("NexusRelay", "Native Forward Error Body: " + responseBuilder);
                        }
                    }
                    conn.disconnect();
                } catch (Exception e) {
                    android.util.Log.e("NexusRelay", "Native Forward Error", e);
                }
            }
        }).start();
    }

    public static void onFcmTokenRefreshed(String token) {
        if (instance == null) return;
        JSObject ret = new JSObject();
        ret.put("token", token);
        instance.notifyListeners("onFcmTokenRefreshed", ret, true);
    }

    static String toCallStateString(int state) {
        if (state == TelephonyManager.CALL_STATE_RINGING) return "RINGING";
        if (state == TelephonyManager.CALL_STATE_OFFHOOK) return "OFFHOOK";
        return "IDLE";
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private static class NexusCallStateCallback extends TelephonyCallback implements TelephonyCallback.CallStateListener {
        @Override
        public void onCallStateChanged(int state) {
            NexusRelayPlugin plugin = NexusRelayPlugin.instance;
            if (plugin == null) {
                return;
            }
            NexusRelayPlugin.onCallStateChanged(plugin.getContext(), null, NexusRelayPlugin.toCallStateString(state));
        }
    }
}
