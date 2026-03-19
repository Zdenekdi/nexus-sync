# 🚀 SIGNED APK BUILD - PŘÍMO PRO TEBE

## 🎯 Co Potřebuješ

1. ✅ **Keystore soubor** - pro podepisování APK
2. ✅ **Hesla** - pro keystore a key
3. ✅ **Build environment** - Java, Gradle, Android SDK
4. ✅ **Čas** - 10-15 minut pro build

---

## 🔑 KROK 1: Vytvoř Keystore (Jednou)

Pokud ještě nemáš keystore, vytvoř ho:

```bash
# Vytvoř nový keystore
keytool -genkey -v -keystore ~/.android/nexus-release-key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias nexus-key
```

**Budou tě na co se zeptat:**
- Keystore password: **Vymysli si silné heslo** (např: MySecurePass123!)
- Key password: **Stejné heslo**
- First name: Tvoje jméno
- Last name: Tvoje příjmení
- Organization: Tvá firma/jméno
- City: Tvoje město
- State: Tvůj stát
- Country: Kód (CZ, US, atd)

**✅ ZAPAMATUJ SI TOTO:**
- Keystore path: `~/.android/nexus-release-key.jks`
- Keystore password: `(tvoje heslo)`
- Key alias: `nexus-key`
- Key password: `(stejné heslo)`

---

## 📝 KROK 2: Nastav Build.gradle pro Podepisování

Najdi soubor: `/Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android/app/build.gradle`

Najdi sekci `android {` a přidej **PŘED** `buildTypes`:

```gradle
android {
    namespace = "com.nexushub.app"
    compileSdk = rootProject.ext.compileSdkVersion
    
    // PŘIDEJ TOTO:
    signingConfigs {
        release {
            storeFile file(System.getenv("NEXUS_KEYSTORE_PATH") ?: "${System.getProperty('user.home')}/.android/nexus-release-key.jks")
            storePassword System.getenv("NEXUS_KEYSTORE_PASSWORD")
            keyAlias System.getenv("NEXUS_KEY_ALIAS")
            keyPassword System.getenv("NEXUS_KEY_PASSWORD")
        }
    }
    
    // Poté je buildTypes sekcece...
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 🔨 KROK 3: Příprav Prostředí

Spusť tyto příkazy v **Terminálu**:

```bash
# 1. Jdi do Android složky
cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android

# 2. Nastav environment variables (POUŽIJ SVÉ HODNOTY!)
export NEXUS_KEYSTORE_PATH=~/.android/nexus-release-key.jks
export NEXUS_KEYSTORE_PASSWORD=MySecurePass123!
export NEXUS_KEY_ALIAS=nexus-key
export NEXUS_KEY_PASSWORD=MySecurePass123!

# Ověř že jsou nastaveny
echo $NEXUS_KEYSTORE_PASSWORD
```

---

## 🏗️ KROK 4: Postav SIGNED APK

```bash
# 1. Jdi do Android složky (pokud nejsi tam)
cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android

# 2. Smaž staré buildy
./gradlew clean

# 3. Postav release APK
./gradlew assembleRelease

# ⏳ ČEKEJ 5-15 MINUT (první build je pomaleší)
```

**Při buildu uvidíš:**
```
BUILD SUCCESSFUL in X minutes
1234 actionable tasks
```

---

## ✅ KROK 5: Najdi Signed APK

Po úspěšném buildu je APK zde:

```bash
# Zkontroluj zda APK existuje
ls -lh /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android/app/release/Nexus-Relay-*.apk

# Měl by ses vidět něco jako:
# Nexus-Relay-v0.12.apk (45 MB)
```

---

## 📱 KROK 6: Testuj na Zařízení

### A) Instalace na Android telefon (USB):

```bash
# 1. Připoj Android telefon kabelem
# 2. Spusť na telefonu USB Debug (Settings → Developer Options → USB Debugging)

# 3. Instaluj APK
adb install -r /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android/app/release/Nexus-Relay-v*.apk

# 4. Otevři app a testuj
```

### B) Kopíruj APK a instaluj ručně:

```bash
# Zkopíruj APK kam chceš
cp /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android/app/release/Nexus-Relay-v*.apk ~/Downloads/

# Pak si ho vezmi na telefon přes email/cloud/USB
```

---

## 🎯 OVĚŘ ŽE SIGNED APK FUNGUJE

Na telefonu otestuj:

- [ ] App se spustí
- [ ] Login funguje
- [ ] Dashboard se zobrazuje
- [ ] Mobil responsive (hvězda naší optimalizace!)
- [ ] Všechny tlačítka fungují
- [ ] Žádné errory v console

---

## 📊 VÝSLEDNÝ APK

Co obsahuje tvůj signed APK:

✅ React app (all pages + mobile optimization)
✅ Android native code
✅ Capacitor plugins
✅ Všechny závislosti
✅ Přeoptimalizován (ProGuard)
✅ Podepsán tvým klíčem
✅ Připraven na Play Store

---

## 🚀 PLAY STORE (Až budeš chtít)

Když chceš dát app na Play Store:

1. Jdi na Google Play Console (https://play.google.com/console)
2. Vytvoř novou aplikaci
3. Upload tvého signed APK
4. Vyplň popis, screenshots, atd
5. Submit na review
6. (~1-3 hodiny a app je live!)

---

## ⚠️ POKUD NĚCO SELŽE

### "Build failed"
```bash
# Zkus to znova s clean
./gradlew clean
./gradlew assembleRelease -x lint
```

### "Keystore not found"
- Ověř že file existuje: `ls ~/.android/nexus-release-key.jks`
- Zkontroluj export variables: `echo $NEXUS_KEYSTORE_PATH`

### "APK Not Generated"
- Podívej se do `android/app/build/outputs/apk/release/`
- Pokud nic: `./gradlew clean` a zkus znova

### "Installation Failed"
- Zkus `-r` flag: `adb install -r app/release/Nexus-Relay-v*.apk`
- Nebo smaž starou verzi z telefonu a instaluj znova

---

## 🎁 BONUSY (Co je v TOMTO BUILDU)

Protože jsme právě dělali optimalizaci:

✨ **Mobile Responsiveness** - Všechny stránky jsou optimalizované pro mobil!
✨ **Safe-Area Support** - Notchy na iPhonech jsou teď správně handlovány (i když jsi na Android, práce se obejde i pro budoucnost)
✨ **Responsive Fonts** - Text je perfektně čitelný na všech velikostech
✨ **Proper Spacing** - Žádný content na okrajích

---

## 📋 QUICK CHECKLIST

```
PŘED BUILDEM:
☐ Keystore vytvořen: ~/.android/nexus-release-key.jks
☐ Má znám hesla a aliasy
☐ build.gradle má signingConfig nastavený
☐ Environment variables exportovány
☐ npm run build hotov v React app

BĚHEM BUILDU:
☐ ./gradlew clean spuštěn
☐ ./gradlew assembleRelease spuštěn
☐ Čekám na "BUILD SUCCESSFUL"

PO BUILDU:
☐ APK soubor existuje
☐ APK instalován na zařízení
☐ App testován na mobilu
☐ Všechno funguje!
```

---

## 🎯 SHRNUTÍ - UDĚLEJ TOTO V TOMTO POŘADÍ

1. **Vytvoř keystore** (pokud ještě není):
   ```bash
   keytool -genkey -v -keystore ~/.android/nexus-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias nexus-key
   ```

2. **Nastav build.gradle** - Přidej signingConfig (viz KROK 2 výše)

3. **Export variables** (v Terminálu):
   ```bash
   export NEXUS_KEYSTORE_PATH=~/.android/nexus-release-key.jks
   export NEXUS_KEYSTORE_PASSWORD=tvoje_heslo
   export NEXUS_KEY_ALIAS=nexus-key
   export NEXUS_KEY_PASSWORD=tvoje_heslo
   ```

4. **Postav APK**:
   ```bash
   cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

5. **Testuj**: `adb install -r app/release/Nexus-Relay-v*.apk`

6. **Raduj se! 🎉**

---

**Všechno máš? Pusť se do toho!**

Máš nějaké otázky, dejme mi vědět. Build trvá cca 10-15 minut, takže ti doporučuji si na to udělat čaj. ☕

---

Pro více detailů viz: SIGNED_APK_BUILD_GUIDE.md (úplný guide)

