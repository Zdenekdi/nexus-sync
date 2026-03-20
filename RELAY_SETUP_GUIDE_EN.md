# Nexus Relay & Firebase Setup Manual (EN)

This guide will walk you through the complete setup of the connection between your server and Android devices using Firebase (FCM).

---

## 1. Firebase Setup on Server

To allow the server to send notifications (commands to send SMS) to the phone, it needs access credentials.

### Step A: Obtaining the JSON File
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project (Nexus Hub).
3.  Click on **Project Settings** (gear icon) -> **Service Accounts**.
4.  Click on **Generate New Private Key**. A `.json` file will be downloaded.

### Step B: Configuration in `.env`
Open the `server/.env` file and add the content of the downloaded JSON (all on one line without spaces) or save it to the server and reference it:

**Option 1 (Recommended):**
Insert everything into one variable:
`FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", "project_id": "...", ...}'`

**Option 2 (Local file):**
`GOOGLE_APPLICATION_CREDENTIALS="/path/to/file/firebase-key.json"`

---

## 2. Verifying Device Registration (Push Token)

Once the user logs into the app, they must send their "Push Token" to the server.

### How to verify in the browser:
1.  Open the app and log in.
2.  Press `F12` (DevTools) and go to the **Network** tab.
3.  Look for the `POST /api/device/push-token` request.
4.  **Check:**
    *   **Status Code:** must be `200 OK`.
    *   **Authorization Header:** must contain `Bearer <your_JWT_token>`.
    *   **Payload:** should look like this: `{"token": "fcm-token-string", "platform": "android"}`.

If you don't see this request, check the app log (Logcat in Android Studio) to see if the token was successfully generated.

---

## 3. Testing Inbound Webhooks (SMS / Calls)

You can simulate an incoming SMS to the phone and test if it appears in the Dashboard.

### SMS Test (Nexus Relay simulation):
Run this command in the terminal (replace the URL with your address and deviceId with a valid operator ID):

```bash
curl -X POST https://nexus-api.myvnc.com/api/device/relay \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "op-01",
    "type": "sms",
    "from": "+420123456789",
    "content": "Hello, this is a test message through Nexus Relay!"
  }'
```

---

## 4. Troubleshooting

*   **Error 401 Unauthorized:** Incorrect JWT token or missing/invalid Firebase credentials.
*   **Message does not appear:** Check if a **Profile** with the phone number you are testing exists in the database (the `phoneNumber` field must exactly match the `from` field in the JSON).
*   **Push notifications not arriving:** Check the server log to see if Firebase reports `messaging/registration-token-not-registered`. This means the token has expired.
