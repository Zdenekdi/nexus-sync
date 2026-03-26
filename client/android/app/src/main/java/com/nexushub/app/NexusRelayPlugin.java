package com.nexushub.app;

import android.telephony.SmsManager;
import android.Manifest;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import androidx.activity.result.ActivityResult;
import androidx.annotation.RequiresApi;
import java.nio.charset.StandardCharsets;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NexusRelay",
    permissions = {
        @Permission(alias = NexusRelayPlugin.SMS_PERMISSION_ALIAS, strings = { Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS, Manifest.permission.SEND_SMS }),
        @Permission(alias = NexusRelayPlugin.PHONE_PERMISSION_ALIAS, strings = { Manifest.permission.READ_PHONE_STATE, Manifest.permission.READ_CALL_LOG }),
        @Permission(alias = NexusRelayPlugin.LOCATION_PERMISSION_ALIAS, strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION })
    }
)
public class NexusRelayPlugin extends Plugin {
    static final String PREFS_NAME = "NexusRelayPrefs";
    static final String KEY_BASE_URL = "baseUrl";
    static final String KEY_DEVICE_ID = "deviceId";
    static final String KEY_INSTALLATION_ID = "installationId";
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

    @PluginMethod
    public void checkStatus(PluginCall call) {
        call.resolve(buildStatus());
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
        String installationId = call.getString("installationId");
        Boolean isActive = call.getBoolean("isActive", false);

        Context context = getContext();
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = prefs.edit();
        
        if (baseUrl != null) editor.putString(KEY_BASE_URL, baseUrl);
        if (deviceId != null) editor.putString(KEY_DEVICE_ID, deviceId);
        if (installationId != null) editor.putString(KEY_INSTALLATION_ID, installationId);
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

    @PluginMethod
    public void confirmDeviceCredential(PluginCall call) {
        KeyguardManager keyguardManager = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        JSObject ret = new JSObject();

        if (keyguardManager == null || !keyguardManager.isDeviceSecure()) {
            ret.put("available", false);
            ret.put("unlocked", false);
            call.resolve(ret);
            return;
        }

        String title = call.getString("title", "Unlock Nexus Hub");
        String description = call.getString("description", "Confirm your screen lock to continue");
        Intent intent = keyguardManager.createConfirmDeviceCredentialIntent(title, description);

        if (intent == null) {
            ret.put("available", false);
            ret.put("unlocked", false);
            call.resolve(ret);
            return;
        }

        startActivityForResult(call, intent, "confirmDeviceCredentialCallback");
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        String to = call.getString("to");
        String text = call.getString("text");

        if (to == null || text == null) {
            call.reject("Recipient and text are required");
            return;
        }

        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = getContext().getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            if (text.length() > 160) {
                java.util.ArrayList<String> parts = smsManager.divideMessage(text);
                smsManager.sendMultipartTextMessage(to, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(to, null, text, null, null);
            }

            // Emit event to JS for real-time logging in UI
            JSObject relayEvent = new JSObject();
            relayEvent.put("type", "sms");
            relayEvent.put("from", to);
            relayEvent.put("content", text);
            relayEvent.put("status", "sent");
            relayEvent.put("direction", "outbound");
            notifyListeners("relay_event", relayEvent);

            JSObject ret = new JSObject();
            ret.put("sent", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("SMS failed to send: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSmsHistory(PluginCall call) {
        long lastTimestamp = call.getLong("lastTimestamp", 0L);
        int limit = call.getInt("limit", 500);
        JSArray messages = new JSArray();

        try {
            Uri uri = Uri.parse("content://sms/");
            String[] projection = new String[] { "_id", "address", "body", "date", "type" };
            String selection = "date > ?";
            String[] selectionArgs = new String[] { String.valueOf(lastTimestamp) };
            String sortOrder = "date ASC LIMIT " + limit;

            Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, selectionArgs, sortOrder);

            if (cursor != null) {
                if (cursor.moveToFirst()) {
                    do {
                        JSObject msg = new JSObject();
                        msg.put("id", cursor.getString(cursor.getColumnIndexOrThrow("_id")));
                        msg.put("address", cursor.getString(cursor.getColumnIndexOrThrow("address")));
                        msg.put("body", cursor.getString(cursor.getColumnIndexOrThrow("body")));
                        msg.put("date", cursor.getLong(cursor.getColumnIndexOrThrow("date")));
                        int type = cursor.getInt(cursor.getColumnIndexOrThrow("type"));
                        // 1 = MESSAGE_TYPE_INBOX, 2 = MESSAGE_TYPE_SENT
                        msg.put("type", type == 1 ? "inbound" : "outbound");
                        messages.put(msg);
                    } while (cursor.moveToNext());
                }
                cursor.close();
            }

            JSObject ret = new JSObject();
            ret.put("messages", messages);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to fetch SMS history: " + e.getMessage());
        }
    }

    // ── Static send_sms entry point (called natively from NexusFcmService) ─────
    // Sends an SMS using data from a FCM data-only payload without needing
    // the JS / Capacitor layer to be running (works when screen is off / killed).
    public static void sendSmsFromData(Context context, java.util.Map<String, String> data) {
        if (context == null || data == null) return;

        // Only proceed if relay mode is active
        boolean isActive = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_IS_ACTIVE, false);
        if (!isActive) {
            android.util.Log.w("NexusRelay", "sendSmsFromData: relay not active, skipping");
            return;
        }

        String to = data.get("to");
        String content = data.get("content");
        if (to == null || to.isEmpty() || content == null || content.isEmpty()) {
            android.util.Log.w("NexusRelay", "sendSmsFromData: missing to/content");
            return;
        }

        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = context.getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }
            if (smsManager == null) {
                android.util.Log.e("NexusRelay", "sendSmsFromData: SmsManager unavailable");
                return;
            }
            if (content.length() > 160) {
                java.util.ArrayList<String> parts = smsManager.divideMessage(content);
                smsManager.sendMultipartTextMessage(to, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(to, null, content, null, null);
            }
            android.util.Log.d("NexusRelay", "sendSmsFromData: SMS sent to " + to);
        } catch (Exception e) {
            android.util.Log.e("NexusRelay", "sendSmsFromData: failed to send SMS", e);
        }
    }

    // ── Battery Optimization PluginMethods ───────────────────────────────
    @PluginMethod
    public void checkBatteryOptimization(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            boolean isIgnoring = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            ret.put("optimized", !isIgnoring);
        } else {
            ret.put("optimized", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("requested", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Could not open battery optimization settings: " + e.getMessage());
            }
        } else {
            JSObject ret = new JSObject();
            ret.put("requested", false);
            call.resolve(ret);
        }
    }

    @ActivityCallback
    private void confirmDeviceCredentialCallback(PluginCall call, ActivityResult result) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("unlocked", result != null && result.getResultCode() == Activity.RESULT_OK);
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
        String installationId = prefs.getString(KEY_INSTALLATION_ID, null);

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
            forwardDataNative(baseUrl, deviceId, installationId, safeTransport, safeFrom, safeBody);
        }
    }

    public static void onCallStateChanged(Context context, String from, String state) {
        // Ignore IDLE state – fired on listener registration and after call ends;
        // logging it would create phantom "call" entries when no call occurred.
        if (state == null || state.equals("IDLE")) {
            return;
        }
        
        // Prevent duplicate calls from Android 12+ TelephonyCallback which fires with null 'from'
        if (from == null || from.trim().isEmpty()) {
            return;
        }

        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isActive = prefs.getBoolean(KEY_IS_ACTIVE, false);
        String baseUrl = prefs.getString(KEY_BASE_URL, null);
        String deviceId = prefs.getString(KEY_DEVICE_ID, "RELAY-DEVICE");
        String installationId = prefs.getString(KEY_INSTALLATION_ID, null);

        // 1. Notify JS
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("from", from);
            ret.put("state", state);
            instance.notifyListeners("onCallStateChanged", ret, true);
        }

        // 2. Native Background Forwarding
        if (isActive && baseUrl != null) {
            forwardDataNative(baseUrl, deviceId, installationId, "call", from, "State: " + state);
        }
    }

    private static void forwardDataNative(final String baseUrl, final String deviceId, final String installationId, final String type, final String from, final String content) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    java.net.URL url = new java.net.URL(baseUrl);
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(12000);
                    conn.setReadTimeout(12000);

                    org.json.JSONObject jsonParam = new org.json.JSONObject();
                    jsonParam.put("deviceId", deviceId);
                    if (installationId != null && !installationId.isEmpty()) {
                        jsonParam.put("installationId", installationId);
                    }
                    jsonParam.put("transport", type);
                    jsonParam.put("type", type);
                    jsonParam.put("from", from);
                    jsonParam.put("content", content);
                    jsonParam.put("secret", com.nexushub.app.BuildConfig.DEVICE_SECRET);
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
