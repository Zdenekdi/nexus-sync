# Nexus Relay - Android Native Testing Guide

This guide explains how to run automated tests on the native **Nexus Relay** Android application.

## 📋 Prerequisites

1.  **Android Studio**: Make sure you have an emulator running or a physical phone connected via USB.
2.  **USB Debugging**: Enabled on the device (Settings > Developer Options).
3.  **ADB in PATH**: The command `adb devices` should show your device.
    - Typical path: `~/Library/Android/sdk/platform-tools`
4.  **App Installed**: The app `com.nexushub.app` must be installed on the device.
    - Build in Android Studio or run: `adb install client/android/app/build/outputs/apk/debug/app-debug.apk`

### 📱 Using Virtual Devices (Emulators)
If you don't have a physical device connected, you can start an emulator from the terminal:
1.  **List your AVDs**: `npm run emulator:list`
2.  **Start your emulator**: `npm run emulator:start -- YOUR_AVD_NAME`
    - *(Example: `npm run emulator:start -- Pixel_5_API_33`)*

## 🚀 Running Tests

### 1. Verification of Connection
Run this in your terminal to see if Playwright detects the device:
```bash
npx playwright test tests/android/native_app_smoke.spec.js --config=playwright.android.config.js
```

### 2. Available Scripts
We've added convenient scripts to `package.json`:

- **`npm run test:android:native`**: Runs the smoke test for the native app.
- **`npm run android:sync`**: Synchronizes the web code (`dist`) into the Android project.

## 🛠️ Debugging Tips

- **WebView not found**: If Playwright says "WebView not found", ensure the app is open on the screen and is debuggable (standard for debug builds).
- **Multiple devices**: If you have multiple phones connected, specify the device ID in the test fixture (current test uses the first available one).
- **Ports**: Nexus Hub normally uses port `5173`. We handle port forwarding automatically in the test script.

## 📸 Artifacts
Test results and screenshots (on failure) will be saved in the `playwright-report/` directory.
