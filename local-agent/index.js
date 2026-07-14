require('dotenv').config();
const { io } = require("socket.io-client");
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createCursor } = require('ghost-cursor');
const axios = require('axios');
const CaptchaSolver = require('./solver');

chromium.use(StealthPlugin());

const { checkAdsPower } = require('./setup');

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const ADS_POWER_PORT = process.env.ADS_POWER_PORT || "50325";
const ADS_POWER_URL = `http://local.adspower.com:${ADS_POWER_PORT}`;
const solver = new CaptchaSolver(process.env.CAPSOLVER_KEY);

// BACKEND_URL nese přes socket citlivá data (platformní credentials) — nešifrovaný
// http mimo localhost je únik. Upozorni (nerozbíjej dev na localhost).
(() => {
    try {
        const u = new URL(BACKEND_URL);
        const local = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
        if (u.protocol !== 'https:' && !local) {
            console.warn(`⚠️  BACKEND_URL je nešifrované (${BACKEND_URL}) — credentials by tekly v plaintextu. Použij https://`);
        }
    } catch { console.warn(`⚠️  BACKEND_URL není platná URL: ${BACKEND_URL}`); }
})();

// adsPowerId přichází ze serveru → validuj, ať nejde injektovat do lokální AdsPower
// API URL. AdsPower profile ID je krátký alfanumerický řetězec.
function assertSafeAdsPowerId(id) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
        throw new Error(`Neplatné AdsPower ID: ${JSON.stringify(id)}`);
    }
    return id;
}

// AdsPower běží lokálně → vrácený CDP endpoint musí mířit na localhost. Jinak by se
// Playwright mohl připojit na cizí WS (SSRF-ish kontrola prohlížeče ze serveru).
function assertLocalCdpEndpoint(ws) {
    let u;
    try { u = new URL(ws); } catch { throw new Error(`Neplatný CDP endpoint: ${ws}`); }
    const okProto = u.protocol === 'ws:' || u.protocol === 'wss:';
    const okHost = ['127.0.0.1', 'localhost', '::1'].includes(u.hostname);
    if (!okProto || !okHost) throw new Error(`CDP endpoint není lokální (odmítám): ${ws}`);
    return ws;
}

// Bezpečně otevře AdsPower prohlížeč a vrátí připojený Playwright browser.
async function openAdsPowerBrowser(adsPowerId) {
    assertSafeAdsPowerId(adsPowerId);
    const id = encodeURIComponent(adsPowerId);
    const check = await axios.get(`${ADS_POWER_URL}/api/v1/browser/active?user_id=${id}`).catch(() => ({ data: {} }));
    let wsEndpoint;
    if (check.data?.data?.status === 'active') {
        wsEndpoint = check.data.data.ws.puppeteer;
    } else {
        const resp = await axios.get(`${ADS_POWER_URL}/api/v1/browser/start?user_id=${id}`);
        if (resp.data.code !== 0) throw new Error(`AdsPower: ${resp.data.msg}`);
        wsEndpoint = resp.data.data.ws.puppeteer;
    }
    assertLocalCdpEndpoint(wsEndpoint);
    return chromium.connectOverCDP(wsEndpoint);
}

async function startAgent() {
    // Preferuj AGENT_API_KEY (full-auto: stabilní, neexpiruje, revokovatelný smazáním
    // klíče v dashboardu). RELAY_TOKEN (30denní JWT) je zpětně-kompatibilní fallback.
    const apiKey = process.env.AGENT_API_KEY;
    const legacyToken = process.env.RELAY_TOKEN;
    if (!apiKey && (!legacyToken || legacyToken === 'VAŠ_TOKEN_Z_DASHBOARDU')) {
        console.error("❌ CHYBA: Chybí AGENT_API_KEY (doporučeno) nebo RELAY_TOKEN v .env!");
        console.log("👉 Vygeneruj API klíč se scopem 'relay:bridge' v dashboardu (Developer API) a vlož ho jako AGENT_API_KEY.");
        process.exit(1);
    }

    const isAdsPowerReady = await checkAdsPower();
    if (!isAdsPowerReady) {
        console.warn("⚠️  VAROVÁNÍ: AdsPower není spuštěn.");
        console.log("👉 Ujistěte se, že máte AdsPower nainstalovaný a spuštěný na portu " + ADS_POWER_PORT);
        // Neukončujeme, třeba ho uživatel spustí hned po startu agenta
    }

    console.log(`🚀 Nexus Local Agent (v2) — Multi-Platform Automation Ready (${apiKey ? 'API key' : 'legacy token'})`);

    const socket = io(BACKEND_URL, {
        auth: apiKey
            ? { apiKey, type: 'local-bridge' }
            : { token: legacyToken, type: 'local-bridge' }
    });

    socket.on("relay_command", async (data) => {
        if (data.type === 'SYNC_WEB_PROFILE') {
            console.log(`📥 Úkol: Sync pro modelku ${data.payload.name}`);
            await runMasterSync(data.payload);
        } else if (data.type === 'BOOST_WEB_PROFILE') {
            console.log(`🚀 Úkol: Organic Boost pro modelku ${data.payload.name} na ${data.payload.platform}`);
            await runMasterBoost(data.payload);
        }
    });

    socket.on("connect", () => {
        console.log("✅ Připojeno k serveru Nexus.");
    });

    socket.on("disconnect", () => {
        console.warn("⚠️  Odpojeno od serveru. Pokouším se o znovupřipojení...");
    });
}

// Spuštění agenta
startAgent().catch(err => {
    console.error("💥 Kritická chyba při startu agenta:", err);
});

// Pomocná funkce pro lidské psaní
async function humanType(page, selector, text) {
    if (!text) return;
    await page.focus(selector);
    // Lidské vymazání pole (Ctrl+A -> Backspace)
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Meta+A'); // Pro Mac
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 200));

    for (const char of text) {
        await page.type(selector, char, { delay: Math.random() * 100 + 40 });
    }
}

async function runMasterSync(payload) {
    const { adsPowerId, credentials, bio, platforms } = payload;
    if (!adsPowerId) {
        console.error("❌ Chybí AdsPower ID.");
        return;
    }

    let browser;
    try {
        console.log(`🔧 Startuji prohlížeč (ID: ${adsPowerId})`);
        browser = await openAdsPowerBrowser(adsPowerId);
        const context = browser.contexts()[0];
        
        // Pokud už je stránka otevřená, použijeme ji, jinak vytvoříme novou
        const pages = context.pages();
        const page = pages.length > 0 ? pages[0] : await context.newPage();
        
        const cursor = createCursor(page);

        for (const platform of platforms) {
            console.log(`🤖 Pracuji na: ${platform.toUpperCase()}`);
            const creds = credentials ? credentials[platform] : null;
            
            if (platform === 'adultwork') {
                await syncAdultwork(page, cursor, bio, creds);
            } else if (platform === 'amateri') {
                await syncAmateri(page, cursor, bio, creds);
            } else if (platform === 'onlyfans') {
                await syncOnlyFans(page, cursor, bio, creds);
            }
        }

        console.log("✅ Všechny platformy synchronizovány.");
        
        // Informujeme server, že je hotovo, aby se v UI mohl zastavit loader
        socket.emit('relay_event', {
            type: 'SYNC_COMPLETED',
            profileId: payload.profileId,
            platforms: platforms
        });
        
        // Browser nebudeme zavírat, aby operátor mohl zkontrolovat výsledek
    } catch (err) {
        console.error(`🔴 Chyba syncu: ${err.message}`);
    }
}

async function runMasterBoost(payload) {
    const { adsPowerId, credentials, platform, settings } = payload;
    if (!adsPowerId) return console.error("❌ Chybí AdsPower ID.");

    let browser;
    try {
        browser = await openAdsPowerBrowser(adsPowerId);
        const context = browser.contexts()[0];
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        const cursor = createCursor(page);

        const creds = credentials ? credentials[platform] : null;

        if (platform === 'adultwork') {
            await boostAdultwork(page, cursor, creds, settings);
        }

        console.log(`✅ Boost pro ${platform} dokončen.`);
    } catch (err) {
        console.error(`🔴 Chyba boostu: ${err.message}`);
    }
}

// --- ADULTWORK MODUL ---
async function syncAdultwork(page, cursor, bio, creds) {
    try {
        console.log("   -> Adultwork Mobile Sync start...");
        await page.goto('https://m.adultwork.com/Member/Profile.asp', { waitUntil: 'domcontentloaded', timeout: 45000 });
        
        // Detekce Cloudflare / Blokace
        if (await page.title() === "Attention Required! | Cloudflare" || await page.content().then(c => c.includes('Sorry, you have been blocked'))) {
            console.error("   🔴 KRITICKÉ: Adultwork zablokoval přístup (Cloudflare). Zkontrolujte Proxy/AdsPower.");
            return;
        }

        if (page.url().includes('login.asp')) {
            console.log("   -> Vyžadováno přihlášení (Mobilní verze)...");
            if (!creds) return console.warn("      ! Chybí credentials pro Adultwork");
            
            // Mobilní login selektory
            await humanType(page, 'input[name="UserID"], input[name="nickname"]', creds.user);
            await humanType(page, 'input[name="password"]', creds.pass);
            
            await solver.solve(page, 'hcaptcha'); // Případně ALTCHA, pokud se objeví
            
            await cursor.click('input[value="Login"], button[type="submit"]');
            await page.waitForNavigation({ timeout: 20000 }).catch(() => {});
        }

        console.log("   -> Upravuji profil (Mobilní verze)...");
        await page.goto('https://m.adultwork.com/Member/Profile.asp', { waitUntil: 'domcontentloaded' });
        // Na mobilu je About Me často přímo na této stránce nebo pod odkazem Edit
        if (await page.$('#txtAboutMe')) {
            await humanType(page, '#txtAboutMe', bio);
            await cursor.click('#btnUpdate, input[value="Update"]');
        } else {
            console.log("      [INFO] Přepínám na detailní editaci...");
            await page.goto('https://m.adultwork.com/Member/ProfileEdit.asp', { waitUntil: 'domcontentloaded' });
            await humanType(page, '#txtAboutMe', bio);
            await cursor.click('#btnSave, input[value="Save"]');
        }
        console.log("   -> Adultwork Mobile: Hotovo.");
    } catch (e) { console.error(`   ! Adultwork error: ${e.message}`); }
}

async function boostAdultwork(page, cursor, creds, settings) {
    try {
        console.log("   -> Adultwork Mobile Organic Boost start...");
        await page.goto('https://m.adultwork.com/Member/Profile.asp', { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Detekce Blokace
        if (await page.content().then(c => c.includes('Sorry, you have been blocked'))) {
            console.error("   🔴 KRITICKÉ: Adultwork zablokoval přístup (Cloudflare).");
            return;
        }

        if (page.url().includes('login.asp')) {
            if (!creds) return console.warn("      ! Chybí credentials");
            await humanType(page, 'input[name="UserID"], input[name="nickname"]', creds.user);
            await humanType(page, 'input[name="password"]', creds.pass);
            await solver.solve(page, 'hcaptcha');
            await cursor.click('input[value="Login"]');
            await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
        }

        // 1. Available Today/Now
        if (settings.autoAvailable) {
            console.log("   -> Zapínám Available status (Mobilní verze)...");
            // Na mobilu je to často přímo na Profile.asp nebo v Available.asp
            await page.goto('https://m.adultwork.com/Member/Available.asp', { waitUntil: 'domcontentloaded' }).catch(() => {});
            const isSet = await page.$('input[name="chkAvailableToday"]:checked');
            if (!isSet) {
                const check = await page.$('input[name="chkAvailableToday"]');
                if (check) {
                    await cursor.click('input[name="chkAvailableToday"]');
                    await page.waitForTimeout(1000);
                    await cursor.click('input[value="Update"], #btnUpdate');
                    console.log("      [OK] Status Available Today aktivován.");
                }
            } else {
                console.log("      [INFO] Již aktivní.");
            }
        }

        // 2. Summary Tweak (Organic Activity)
        if (settings.tweakSummary) {
            console.log("   -> Provádím drobnou úpravu Summary (Mobilní verze)...");
            await page.goto('https://m.adultwork.com/Member/Profile.asp', { waitUntil: 'domcontentloaded' });
            
            let selector = '#txtAboutMe';
            if (!(await page.$(selector))) {
                await page.goto('https://m.adultwork.com/Member/ProfileEdit.asp', { waitUntil: 'domcontentloaded' });
            }

            const currentAbout = await page.$eval(selector, el => el.value).catch(() => "");
            if (currentAbout) {
                let newAbout = currentAbout.trim();
                newAbout = newAbout.endsWith('.') ? newAbout.slice(0, -1) : newAbout + '.';
                await humanType(page, selector, newAbout);
                await cursor.click('input[value="Update"], input[value="Save"], #btnSave');
                console.log("      [OK] Summary upraveno.");
            }
        }

        // 3. Photo Rotation
        if (settings.rotatePhotos) {
            console.log("   -> Rotace fotek (Mobilní verze)...");
            await page.goto('https://m.adultwork.com/Member/Photos.asp', { waitUntil: 'domcontentloaded' });
            const swapBtns = await page.$$('input[value="Make Main"], input[value="Set as Main"]');
            if (swapBtns.length > 0) {
                const randomPhotoIdx = Math.floor(Math.random() * swapBtns.length);
                console.log(`      [OK] Nastavuji fotku ${randomPhotoIdx + 1} jako hlavní.`);
                await swapBtns[randomPhotoIdx].click();
                await page.waitForTimeout(2000);
            }
        }

    } catch (e) {
        console.error(`   ! Adultwork Mobile Boost Error: ${e.message}`);
    }
}

// --- AMATERI.COM MODUL ---
async function syncAmateri(page, cursor, bio, creds) {
    try {
        await page.goto('https://www.amateri.com/cs/nastaveni-profilu', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        if (page.url().includes('prihlaseni')) {
            console.log("   -> Přihlašuji k Amateri...");
            if (!creds) return console.warn("      ! Chybí credentials pro Amateri");
            await humanType(page, 'input[name="username"]', creds.user);
            await humanType(page, 'input[name="password"]', creds.pass);
            
            // Amateri používá Turnstile (Cloudflare)
            await solver.solve(page, 'turnstile');
            
            await cursor.click('button[type="submit"]');
            await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        }

        await humanType(page, 'textarea[name="biography"]', bio);
        await cursor.click('#save-profile-btn');
        console.log("   -> Amateri: Hotovo.");
    } catch (e) { console.error(`   ! Amateri error: ${e.message}`); }
}

// --- ONLYFANS MODUL ---
async function syncOnlyFans(page, cursor, bio, creds) {
    try {
        await page.goto('https://onlyfans.com/my/settings/profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        if (page.url().includes('login')) {
            console.log("   -> OnlyFans: Vyžadováno přihlášení...");
            if (!creds) return console.warn("      ! Chybí credentials pro OnlyFans");
            await humanType(page, 'input[name="email"]', creds.user);
            await humanType(page, 'input[name="password"]', creds.pass);
            
            // OnlyFans používá HCaptcha
            await solver.solve(page, 'hcaptcha');
            
            await cursor.click('button[type="submit"]');
            await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        }

        await humanType(page, 'textarea[name="about"]', bio);
        await cursor.click('button.b-profile__header__btn-save');
        console.log("   -> OnlyFans: Hotovo.");
    } catch (e) { console.error(`   ! OnlyFans error: ${e.message}`); }
}
