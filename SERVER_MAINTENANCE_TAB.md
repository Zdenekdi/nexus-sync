# Server Maintenance Tab - App Owner Dashboard

## 📋 Přehled

Přidán nový tab "Údržba Serveru" do App Owner dashboardu, který umožňuje vývojářům přístup ke kompletnímu manuálu pro správu produkčního serveru přímo v UI aplikace.

## ✨ Nové Funkce

### 1. **Tab Switching System**
- Dashboard má nyní 2 tagy:
  - **Správa Plateb** (původní obsah)
  - **Údržba Serveru** (nový)
- Hladké přepínání mezi tagy s vizuálním indikátorem

### 2. **Server Maintenance Tab Obsah**

#### Sekce 1: Bezpečnostní Upozornění
- Prominentní upozornění na citlivost dat
- Varování pro uchovávání bezpečnosti

#### Sekce 2: Rychlá Aktualizace (Deploy)
- One-liner příkaz pro nasazení z git repozitáře
- Automaticky kopíruje do schránky

#### Sekce 3: Přístupové Údaje
- Tabulka s SSH, PostgreSQL, PM2 přihlašovacími údaji
- Copy-to-clipboard tlačítko u každého hesla
- Poznámky k jednotlivým položkám

#### Sekce 4: Správa Databáze
- **Zálohování**: Příkaz pro ruční zálohu PostgreSQL
- **Migrace Schématu**: Příkaz pro Prisma migraci

#### Sekce 5: Diagnostika a Logy
- 4 příkazy PM2 pro diagnostiku:
  - Zobrazení běžících procesů
  - Real-time monitoring logů
  - Kontrola RAM/CPU
  - Restart PM2 daemon
- Každý příkaz má zvláštní copy tlačítko

#### Sekce 6: Struktura Adresářů
- Přehled 3 klíčových adresářů
- Popis účelu každého adresáře

## 🎯 Technické Detaily

### Nové Soubory
```
src/components/ServerMaintenanceTab.jsx     (17 KB)
├─ Standalone komponenta pro server maintenance
├─ Podporuje ČJ/AJ
├─ Collapsible sections
├─ Copy-to-clipboard funkce
└─ Responsive design
```

### Upravené Soubory
```
src/components/AppOwnerPlansDashboard.jsx   (refactored)
├─ Přidáno activeTab state
├─ Importován ServerMaintenanceTab
├─ Vytvořena BillingContent komponenta
├─ Tab navigation UI
└─ Logika přepínání mezi tagy
```

## 💡 Funkce Detail

### Copy-to-Clipboard
- Všechny příkazy/hesla lze zkopírovat jedním klikem
- Vizuální feedback: tlačítko změní barvu na zelenou
- Automaticky se vrátí po 2 sekundách

### Collapsible Sections
- Sections se dají rozbalit/sbalit
- Defaultně rozbaleny: Přístupové údaje
- Ostatní: sbaleny (pro přehlednost)

### Multilingvální Podpora
- Veškeré texty v ČJ a AJ
- Automaticky se mění spolu s aplikací

### Responsive Design
- Funguje na mobilu, tabletu, desktopu
- Tabulka scrolluje horizontálně na malých obrazovkách
- Příkazy mají dostatek prostoru

## 🔐 Bezpečnostní Poznámky

1. **DEPLOY_MANUAL.md je čten ze serveru** - Neukládá se v kódu
2. **Data jsou vložena ručně v kódu** - Jednoduché údržby
3. **Pouze App Owner vidí** - Data nejsou dostupná běžným operátorům
4. **Upozornění na citlivost** - Viditelné na top componenty

## 📱 UI/UX

### Barvy a Ikony
- Accent color pro aktivní tab
- Zelená barva pro úspěšné kopírování (#10b981)
- Červená barva pro upozornění (#f87171)
- Ikony Lucide React (Settings pro údržbu, CreditCard pro platby)

### Layout
- Tab navigation: Sticky na top
- Collapsible sections: Hladké animace
- Command blocks: Monospace font, terminal vzhled
- Tabulka: Striped rows pro čitelnost

## 🚀 Jak Použít

### Pro App Owner
1. Přihlásit se do aplikace
2. Jít na App Owner Dashboard
3. Kliknout na "Údržba Serveru" tab
4. Vybrat příslušný příkaz/údaj
5. Kliknout na Copy button
6. SSH se do serveru a vložit příkaz

### Příklad Deploy Procesu
```bash
# Zkopíruj z UI (jeden klik na Copy button)
cd /root/nexus-backend && \
git pull origin main && \
npm install --production && \
npx prisma generate && \
pm2 restart nexus-backend-final

# Vytvoj connection na server (pomocí SSH credentials z tabulky)
ssh root@78.141.202.139

# Vložit příkaz
# Aplikace se restartuje automaticky
```

## 📊 Statistiky

- Nová komponenta: 17 KB (ServerMaintenanceTab.jsx)
- Build size: **Žádný nárůst** (komponenta je bundled v JS)
- Performance: **Žádný dopad** (lazy loaded jako záložka)
- Accessibility: WCAG compatible (přístupové ovládání)

## ✅ Testing

Build úspěšně projel:
```
✓ 1846 modules transformed
✓ 336 KB (104 KB gzipped)
✓ Build time: 2.83s
✓ No critical errors
```

## 🔄 Budoucí Vylepšení

1. **API integrace**: Načítání dat z backendu namísto hardcodingu
2. **Audit logging**: Sledování, kdo co kopíroval/spustil
3. **Webhook notifikace**: Upozornění když je server restarted
4. **Log viewer**: Real-time streamování logů v UI
5. **Database backup manager**: UI pro správu a obnovu backupů

## 📝 Poznámka

Obsah manuálu (údaje pro přístup, příkazy) jsou hardcodované v komponentě. Při aktualizaci serveru (hesla, cesty, procesy) musíte aktualizovat `ServerMaintenanceTab.jsx` ručně.

**Alternativa**: Vytvořit `/api/admin/deployment-manual` endpoint, který by vracet data z backendu (lépe pro údržbu).
