package com.nexushub.app;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
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
    static final String PREFS_NAME = "NexusRelayPrefs";
    static final String KEY_BASE_URL = "baseUrl";
    static final String KEY_DEVICE_ID = "deviceId";
    static final String KEY_IS_ACTIVE = "isActive";

    static final String SMS_PERMISSION_ALIAS = "sms";
    static final String PHONE_PERMISSION_ALIAS = "phone";
    static final String LOCATION_PERMISSION_ALIAS = "location";
    private static final String[] SUPPORTED_RCS_PACKAGES = { "com.google.android.apps.messaging" };
    private static final long SMS_DEDUP_WINDOW_MS = 8000L;

    public static NexusRelayPlugin instance;
    private NexusPhoneListener phoneListener;
    private TelephonyCallback telephonyCallback;
    private TelephonyManager telephonyManager;
    private static String lastSmsBody;
    private static long lastSmsBodyAt;

    @Override
    public void load() {
        super.load();
        instance = this;

        telephonyManager = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
        if (isRelayActiveInPrefs()) {
            NexusRelayForegroundService.start(getContext());
        }
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
        boolean notificationAccess = isNotificationListenerEnabled(getContext());
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
        status.put("notificationAccess", notificationAccess);
        status.put("rcsMonitoring", notificationAccess);
        return status;
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        JSObject ret = new JSObject();
        ret.put("opened", true);
        ret.put("notificationAccess", isNotificationListenerEnabled(getContext()));
        call.resolve(ret);
    }

    private void maybeRegisterCallStateListener() {
        // Foreground service owns call monitoring when relay mode is active.
        if (isRelayActiveInPrefs()) {
            unregisterCallStateListener();
            return;
        }
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
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = prefs.edit();
        
        if (baseUrl != null) editor.putString(KEY_BASE_URL, baseUrl);
        if (deviceId != null) editor.putString(KEY_DEVICE_ID, deviceId);
        boolean relayActive = isActive != null && isActive;
        editor.putBoolean(KEY_IS_ACTIVE, relayActive);
        editor.apply();

        if (relayActive) {
            unregisterCallStateListener();
            NexusRelayForegroundService.start(context);
        } else {
            NexusRelayForegroundService.stop(context);
            maybeRegisterCallStateListener();
        }

        JSObject ret = buildStatus();
        ret.put("configUpdated", true);
        call.resolve(ret);
    }

    public static void onMessageReceived(Context context, String from, String body) {
        onTransportMessageReceived(context, "sms", from, body, null);
    }

    public static void onRcsMessageReceived(Context context, String from, String body, String sourcePackage) {
        onTransportMessageReceived(context, "rcs", from, body, sourcePackage);
    }

    private static void onTransportMessageReceived(Context context, String transport, String from, String body, String sourcePackage) {
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isActive = prefs.getBoolean(KEY_IS_ACTIVE, false);
        String baseUrl = prefs.getString(KEY_BASE_URL, null);
        String deviceId = prefs.getString(KEY_DEVICE_ID, "RELAY-DEVICE");

        String safeFrom = from != null ? from : "UNKNOWN";
        String safeBody = body != null ? body : "";
        String safeTransport = normalizeTransport(transport);

        if ("sms".equals(safeTransport)) {
            rememberRecentSmsBody(safeBody);
        }

        // 1. Notify JS (for UI logs if app is open)
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("from", safeFrom);
            ret.put("body", safeBody);
            ret.put("transport", safeTransport);
            ret.put("type", safeTransport);
            if (sourcePackage != null) {
                ret.put("sourcePackage", sourcePackage);
            }
            instance.notifyListeners("onMessageReceived", ret, true);
            if ("rcs".equals(safeTransport)) {
                instance.notifyListeners("onRcsReceived", ret, true);
            } else {
                instance.notifyListeners("onSmsReceived", ret, true);
            }
        }

        // 2. Native Background Forwarding
        if (isActive && baseUrl != null) {
            forwardDataNative(baseUrl, deviceId, safeTransport, safeFrom, safeBody);
        }
    }

    public static void onCallStateChanged(Context context, String from, String state) {
        // Ignore IDLE state – fired on listener registration and after call ends;
        // logging it would create phantom "call" entries when no call occurred.
        if (state == null || state.equals("IDLE")) {
            return;
        }

        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isActive = prefs.getBoolean(KEY_IS_ACTIVE, false);
        String baseUrl = prefs.getString(KEY_BASE_URL, null);
        String deviceId = prefs.getString(KEY_DEVICE_ID, "RELAY-DEVICE");

        // 1. Notify JS
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("from", from);
            ret.put("state", state);
            instance.notifyListeners("onCallStateChanged", ret, true);
        }

        // 2. Native Background Forwarding
        if (isActive && baseUrl != null) {
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
                    jsonParam.put("transport", type);
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

    private static String normalizeTransport(String transport) {
        if ("call".equals(transport) || "rcs".equals(transport)) {
            return transport;
        }
        return "sms";
    }

    static boolean isRcsPackageSupported(String packageName) {
        if (packageName == null) {
            return false;
        }
        for (String supportedPackage : SUPPORTED_RCS_PACKAGES) {
            if (supportedPackage.equals(packageName)) {
                return true;
            }
        }
        return false;
    }

    static boolean isNotificationListenerEnabled(Context context) {
        if (context == null) {
            return false;
        }
        String enabledListeners = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        if (enabledListeners == null || enabledListeners.isEmpty()) {
            return false;
        }
        ComponentName componentName = new ComponentName(context, NexusRcsNotificationListenerService.class);
        String flatName = componentName.flattenToString();
        String shortName = componentName.flattenToShortString();
        return enabledListeners.contains(flatName) || enabledListeners.contains(shortName);
    }

    static boolean wasRecentlyCapturedViaSms(String body) {
        String normalizedBody = normalizeBodyFingerprint(body);
        if (normalizedBody.isEmpty()) {
            return false;
        }
        synchronized (NexusRelayPlugin.class) {
            return normalizedBody.equals(lastSmsBody) && (System.currentTimeMillis() - lastSmsBodyAt) < SMS_DEDUP_WINDOW_MS;
        }
    }

    private static void rememberRecentSmsBody(String body) {
        String normalizedBody = normalizeBodyFingerprint(body);
        if (normalizedBody.isEmpty()) {
            return;
        }
        synchronized (NexusRelayPlugin.class) {
            lastSmsBody = normalizedBody;
            lastSmsBodyAt = System.currentTimeMillis();
        }
    }

    private static String normalizeBodyFingerprint(String body) {
        return body == null ? "" : body.trim();
    }

    private boolean isRelayActiveInPrefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_IS_ACTIVE, false);
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
