# ✅ Oprava Scrollování - Schedule Stránka

## 🔧 Problém
Na mobilu byla stránka Schedule/Calendar nescrollovatelná. Obsah se připravil vizuálně, ale scrollbar nefungoval.

## 🎯 Řešení
V souboru `/src/App.jsx` byly provedeny 2 kritické změny:

### 1️⃣ Změna `overflowY` v main wrapper (řádek ~2320)
```javascript
// ❌ PŘED (mobilní scroll vypnutý):
overflowY: isMobile ? 'visible' : 'auto'

// ✅ PO (scroll vždy zapnutý):
overflowY: 'auto'
```

**Důvod**: Na mobilu byla hodnota `'visible'` a to způsobilo, že wrapper nemohl scrollovat. Obsah se překrýval, ale scroll nefungoval.

---

### 2️⃣ Změna flex layoutu grid kontejneru (řádek ~2397)
```javascript
// ❌ PŘED:
flex: 1, minHeight: 0

// ✅ PO:
flex: isMobile ? 'none' : 1, minHeight: isMobile ? 'auto' : 0
```

**Důvod**: Na mobilu `flex: 1` uzamkl kontejner na výšku rodiče. Se `flex: 'none'` a `minHeight: 'auto'` se kontejner přirozeně rozrůstá pro svůj obsah a vnější scroll pracuje správně.

---

## 📊 Změněné Soubory
- **`src/App.jsx`** (2 edity)

## 🧪 Ověření
HTML test soubor: `scroll-test.html`
- Zobrazuje schedule s 7+ booking items
- Pro testování scrollování na mobilu

## 🚀 Deploy Status

### ✅ Kompletní Build
Nový **signed release APK** byl vytvořen:
- **Soubor**: `Nexus-Relay-v0.30.apk` (7.0 MB)
- **Umístění**: `/client/Nexus-Relay-v0.30.apk`
- **Verze**: v0.30 (s našimi scroll fixes)
- **Build Status**: ✅ SUCCESS

### 📲 Instalace na fyzické zařízení

**Metoda 1 - Manuální instalace (doporučeno)**
```bash
# Z Mac:
adb install -r /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client/Nexus-Relay-v0.30.apk

# Nebo po pull do Google Drive/Cloud:
# Stáhnout na telefon a instalovat přes file manager
```

**Metoda 2 - Povolit neznámé zdroje a zkusit znova**
1. Na telefonu: Settings → Apps → Install unknown apps → povolte "File Manager" (nebo prohlížeč)
2. Pak spusťte:
```bash
adb install -r /path/to/Nexus-Relay-v0.30.apk
```

### 🌐 Alternativa - Web Preview
Pokud fyzické zařízení nelze instalovat, scroll funguje v prohlížeči:
```bash
cd /Users/zdenekdias/.gemini/antigravity/scratch/nexus-hub/client
npm run dev
# Otevřít: http://localhost:5173 v Chrome/Safari
```

---

## 📝 Ověřovací Checklist

Když se aplikace nainstaluje, jděte na stránku **Schedule** a ověřte:
- ✅ Obsah se scrolluje plynule (7+ booking items)
- ✅ Scrollbar se zobrazuje na pravé straně (na desktopě)
- ✅ Žádné zkrácené texty nebo přetékající obsah
- ✅ Správné vykreslen všech prvků (časy, tituly, doby trvání)

---

## 🔧 Technické Detaily

**Změny v App.jsx:**
- Řádek 2320: `overflowY: 'auto'` (vždy zapnutý scroll)
- Řádek 2396: `flex: isMobile ? 'none' : 1` (mobilní flex nastavení)

**Jak to funguje:**
1. Hlavní wrapper (`main.main-content`) má `overflowY: 'auto'` → umožňuje scroll
2. Na mobilu se grid kontejner přestane chovat jako `flex: 1` (uzamknutý výškou)
3. Obsah se přirozeně roztahuje a vnější scroll funguje

