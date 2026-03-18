# Nexus Relay: Native Android Implementation Bridge

To make the SMS and Call forwarding work in a real Android environment, you need to add these native elements to your Capacitor project (`android/app/src/main/java/...`).

## 1. Required Permissions (AndroidManifest.xml)
Add these inside the `<manifest>` tag:
```xml
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

## 2. SMS Broadcast Receiver (NexusSmsReceiver.java)
This class intercepts incoming SMS messages even when the app is in the background.

```java
public class NexusSmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle bundle = intent.getExtras();
        if (bundle != null) {
            Object[] pdus = (Object[]) bundle.get("pdus");
            for (Object pdu : pdus) {
                SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                String sender = smsMessage.getDisplayOriginatingAddress();
                String body = smsMessage.getDisplayMessageBody();
                
                // Notify the Capacitor Plugin
                NexusRelayPlugin.onMessageReceived(sender, body);
            }
        }
    }
}
```

## 3. Phone State Listener (NexusPhoneListener.java)
Tracks incoming calls and their states (Ringing, Offhook, Idle).

```java
public class NexusPhoneListener extends PhoneStateListener {
    @Override
    public void onCallStateChanged(int state, String phoneNumber) {
        String stateStr = "IDLE";
        if (state == TelephonyManager.CALL_STATE_RINGING) stateStr = "RINGING";
        if (state == TelephonyManager.CALL_STATE_OFFHOOK) stateStr = "OFFHOOK";
        
        NexusRelayPlugin.onCallStateChanged(phoneNumber, stateStr);
    }
}
```

## 4. Capacitor Plugin Connection
In your `MainActivity.java` or a dedicated Plugin class, you need to expose these events to our React UI:

```java
@NativePlugin()
public class NexusRelayPlugin extends Plugin {
    public static NexusRelayPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    public static void onMessageReceived(String from, String body) {
        JSObject ret = new JSObject();
        ret.put("from", from);
        ret.put("body", body);
        instance.notifyListeners("onSmsReceived", ret);
    }
}
```

---
> [!IMPORTANT]
> This native bridge replaces the need for "SMS Forwarder" and "Automate" apps, making Nexus Relay a self-contained professional gateway.
