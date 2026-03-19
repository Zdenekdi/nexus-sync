# 🔐 Signed APK Build Guide - Nexus Hub

## ✅ Prerequisites Check

Before building signed APK, make sure you have:

- ✅ Android SDK installed
- ✅ Java/JDK installed (minimum JDK 11)
- ✅ Gradle available
- ✅ Android keystore (.jks or .keystore file) OR ability to create one
- ✅ Latest React code built (npm run build done)

---

## 🔑 Step 1: Create or Verify Keystore

### Option A: Use Existing Keystore
If you already have a `.jks` or `.keystore` file:
- Location: typically `~/.android/my-release-key.jks`
- Or: anywhere you stored it

### Option B: Create New Keystore (If you don't have one)

```bash
# Create new keystore
keytool -genkey -v -keystore ~/.android/nexus-release-key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias nexus-key

# You'll be asked for:
# - Keystore password: [create strong password]
# - Key password: [same or different]
# - First/Last name: Your Name
# - Organization: Your Company
# - City: Your City
# - State: Your State
# - Country: CC (e.g., US, CZ)
```

**IMPORTANT: Save the keystore file location and password somewhere safe!**

---

## 🔐 Step 2: Configure Android Build for Signing

### Create signing config in build.gradle

Edit: `/Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android/app/build.gradle`

Add this BEFORE the `buildTypes` section:

```gradle
signingConfigs {
    release {
        storeFile file('/full/path/to/nexus-release-key.jks')
        storePassword 'your-keystore-password'
        keyAlias 'nexus-key'
        keyPassword 'your-key-password'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

**BETTER: Use environment variables instead of hardcoded passwords**

```gradle
signingConfigs {
    release {
        storeFile file(System.getenv("NEXUS_KEYSTORE_PATH") ?: "/path/to/keystore.jks")
        storePassword System.getenv("NEXUS_KEYSTORE_PASSWORD")
        keyAlias System.getenv("NEXUS_KEY_ALIAS")
        keyPassword System.getenv("NEXUS_KEY_PASSWORD")
    }
}
```

Then set environment variables:
```bash
export NEXUS_KEYSTORE_PATH=~/.android/nexus-release-key.jks
export NEXUS_KEYSTORE_PASSWORD=your-password
export NEXUS_KEY_ALIAS=nexus-key
export NEXUS_KEY_PASSWORD=your-password
```

---

## 🔨 Step 3: Build Signed APK

### Quick Command:
```bash
cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android

# Set environment variables first
export NEXUS_KEYSTORE_PATH=~/.android/nexus-release-key.jks
export NEXUS_KEYSTORE_PASSWORD=your-password
export NEXUS_KEY_ALIAS=nexus-key
export NEXUS_KEY_PASSWORD=your-password

# Build release APK
./gradlew assembleRelease

# Or build AAB (App Bundle for Play Store)
./gradlew bundleRelease
```

### Full Build Steps:
```bash
# 1. Clean previous builds
cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android
./gradlew clean

# 2. Build React app first
cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client
npm run build

# 3. Move back to Android folder
cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android

# 4. Export environment variables with your actual values
export NEXUS_KEYSTORE_PATH=~/.android/nexus-release-key.jks
export NEXUS_KEYSTORE_PASSWORD=your-actual-password
export NEXUS_KEY_ALIAS=nexus-key
export NEXUS_KEY_PASSWORD=your-actual-password

# 5. Build signed release APK
./gradlew assembleRelease -x lint

# Wait 5-10 minutes for build to complete
```

---

## 📦 Step 4: Find Your Signed APK

After build completes, your signed APK will be at:

```
/Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android/app/release/Nexus-Relay-v*.apk
```

The APK is ready to:
- Install on Android device
- Upload to Play Store
- Share with users
- Sign and distribute

---

## 📱 Test the APK

### Option A: Install on Connected Device
```bash
cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android

# List connected devices
adb devices

# Install APK
adb install app/release/Nexus-Relay-v*.apk

# Or reinstall (replaces old version)
adb install -r app/release/Nexus-Relay-v*.apk
```

### Option B: Use Android Emulator
```bash
# Open emulator first, then:
adb install app/release/Nexus-Relay-v*.apk
```

### Option C: Manual Installation
- Copy APK to Android device via USB/email
- Open file manager on device
- Tap APK to install
- Allow unknown sources if prompted

---

## 🚀 Upload to Play Store

### Prerequisites:
1. Google Play Developer Account ($25 one-time fee)
2. Signed APK/AAB
3. App screenshots
4. Privacy policy
5. Store listing info

### Steps:
1. Go to Google Play Console: https://play.google.com/console
2. Create new app
3. Fill in app details
4. Upload signed APK/AAB
5. Complete store listing
6. Submit for review (1-3 hours typically)

---

## ⚠️ Common Issues & Solutions

### Issue: "INSTALL_FAILED_INVALID_APK"
**Solution**: 
- APK might be corrupted
- Try building again
- Check you have enough device storage

### Issue: "Signature doesn't match existing cert"
**Solution**:
- You're using wrong keystore
- Check keystore path and password
- If updating app: must use same keystore

### Issue: Build fails with "Error: java.lang.Exception"
**Solution**:
- Check Java/JDK version: `java -version` (need 11+)
- Check gradle: `./gradlew --version`
- Try: `./gradlew clean` then rebuild

### Issue: "NEXUS_KEYSTORE_PASSWORD not set"
**Solution**:
- Make sure to export environment variables first
- Or hardcode password in build.gradle (not secure!)
- Use: `export NEXUS_KEYSTORE_PASSWORD=your-password`

### Issue: Build takes too long
**Solution**:
- First build is slow (5-10 min normal)
- Subsequent builds faster
- Can use `-x lint` to skip linting: `./gradlew assembleRelease -x lint`

---

## 📋 Build Output Examples

### Success Output:
```
BUILD SUCCESSFUL in 7m 45s
1234 actionable tasks
APK generated at: app/release/Nexus-Relay-v0.12.apk
Signing complete: nexus-key
Size: 45.2 MB
```

### Check APK Info:
```bash
# View APK contents
unzip -l app/release/Nexus-Relay-v*.apk | head -20

# Verify signing
jarsigner -verify -verbose app/release/Nexus-Relay-v*.apk

# Check APK size
ls -lh app/release/Nexus-Relay-v*.apk
```

---

## 🔒 Security Best Practices

✅ **DO:**
- Store keystore safely (backup to secure location)
- Use strong passwords (16+ characters)
- Don't commit keystore to git
- Use environment variables for passwords
- Backup keystore file

❌ **DON'T:**
- Hardcode passwords in build.gradle
- Commit keystore to version control
- Share keystore file publicly
- Use weak passwords
- Lose your keystore (you won't be able to update app!)

---

## 🧪 Quick Verification Commands

```bash
# Check Java version (need 11+)
java -version

# Check gradle version
./gradlew --version

# List Android devices
adb devices

# Get APK info
aapt dump badging app/release/Nexus-Relay-v*.apk

# Check if APK is signed
jarsigner -verify -verbose app/release/Nexus-Relay-v*.apk

# Extract version from build.gradle
grep versionName app/build.gradle
```

---

## 📊 Build Configuration

### Included in release build:
```
✅ ProGuard optimization (code obfuscation)
✅ Resource shrinking (removes unused resources)
✅ Signing with keystore
✅ Optimized for size
✅ Mobile responsiveness (just added!)
```

### APK Contents:
```
- React app (dist/)
- Android native code
- Capacitor plugins
- All dependencies
- Assets & resources
```

### Typical APK Size:
- **Uncompressed**: 100-150 MB
- **Compressed**: 40-60 MB
- **With ProGuard**: Smaller by ~20%

---

## 📝 Step-by-Step Quick Reference

```bash
# 1. Create keystore (one time only)
keytool -genkey -v -keystore ~/.android/nexus-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias nexus-key

# 2. Build React app
cd client && npm run build && cd android

# 3. Set environment variables
export NEXUS_KEYSTORE_PATH=~/.android/nexus-release-key.jks
export NEXUS_KEYSTORE_PASSWORD=your-password
export NEXUS_KEY_ALIAS=nexus-key
export NEXUS_KEY_PASSWORD=your-password

# 4. Build signed APK
./gradlew clean
./gradlew assembleRelease

# 5. Find APK
ls -lh app/release/Nexus-Relay-v*.apk

# 6. Install on device
adb install -r app/release/Nexus-Relay-v*.apk

# 7. Test on device
# Open Nexus app and test all features
```

---

## 🎯 Next Steps

1. **Create keystore** (if you don't have one)
2. **Update build.gradle** with signing config
3. **Set environment variables**
4. **Run build command**
5. **Test APK on device**
6. **Upload to Play Store** (when ready)

---

## 📞 Troubleshooting Checklist

- [ ] Java version is 11 or higher
- [ ] Gradle wrapper is working
- [ ] Keystore file exists and is readable
- [ ] Keystore password is correct
- [ ] Key alias matches configured alias
- [ ] Environment variables are exported
- [ ] React build (npm run build) was done
- [ ] No other build processes running
- [ ] Enough disk space available (10GB+)
- [ ] Connected device has developer mode enabled

---

**Ready to build?** Follow the Step-by-Step Quick Reference above!

Created: March 19, 2026  
Updated: Mobile Responsiveness included in build  
Status: Production Ready ✅

