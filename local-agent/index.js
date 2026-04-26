require('dotenv').config();
const { io } = require("socket.io-client");
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createCursor } = require('ghost-cursor');
const axios = require('axios');

chromium.use(StealthPlugin());

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const ADS_POWER_PORT = process.env.ADS_POWER_PORT || "50325";
const ADS_POWER_URL = `http://local.adspower.com:${ADS_POWER_PORT}`;

if (!process.env.RELAY_TOKEN) {
    console.error("❌ CHYBA: Chybí RELAY_TOKEN v .env souboru!");
    process.exit(1);
}

console.log("🚀 Nexus Local Agent (v2) - Multi-Platform Automation Ready");

const socket = io(BACKEND_URL, {
    auth: { token: process.env.RELAY_TOKEN, type: 'local-bridge' }
});

socket.on("relay_command", async (data) => {
    if (data.type === 'SYNC_WEB_PROFILE') {
        console.log(`📥 Úkol: Sync pro modelku ${data.payload.name}`);
        await runMasterSync(data.payload);
    }
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
        
        // Zjištění stavu profilu
        const check = await axios.get(`${ADS_POWER_URL}/api/v1/browser/active?user_id=${adsPowerId}`).catch(() => ({data:{}}));
        let wsEndpoint;

        if (check.data?.data?.status === 'active') {
            console.log("   -> Profil již běží, připojuji se...");
            wsEndpoint = check.data.data.ws.puppeteer;
        } else {
            const resp = await axios.get(`${ADS_POWER_URL}/api/v1/browser/start?user_id=${adsPowerId}`);
            if (resp.data.code !== 0) throw new Error(`AdsPower: ${resp.data.msg}`);
            wsEndpoint = resp.data.data.ws.puppeteer;
        }

        browser = await chromium.connectOverCDP(wsEndpoint);
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
        // Browser nebudeme zavírat, aby operátor mohl zkontrolovat výsledek
    } catch (err) {
        console.error(`🔴 Chyba syncu: ${err.message}`);
    }
}

// --- ADULTWORK MODUL ---
async function syncAdultwork(page, cursor, bio, creds) {
    try {
        await page.goto('https://www.adultwork.com/Member/Profile.asp', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        if (page.url().includes('Login.asp')) {
            console.log("   -> Vyžadováno přihlášení...");
            if (!creds) return console.warn("      ! Chybí credentials pro Adultwork");
            await humanType(page, '#txtLogin', creds.user);
            await humanType(page, '#txtPassword', creds.pass);
            await cursor.click('#btnLogin');
            await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        }

        console.log("   -> Upravuji profil...");
        await page.goto('https://www.adultwork.com/Member/ProfileEdit.asp', { waitUntil: 'domcontentloaded' });
        await humanType(page, '#txtAboutMe', bio);
        await cursor.click('#btnSave');
        console.log("   -> Adultwork: Hotovo.");
    } catch (e) { console.error(`   ! Adultwork error: ${e.message}`); }
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
            await cursor.click('button[type="submit"]');
            await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        }

        await humanType(page, 'textarea[name="about"]', bio);
        await cursor.click('button.b-profile__header__btn-save');
        console.log("   -> OnlyFans: Hotovo.");
    } catch (e) { console.error(`   ! OnlyFans error: ${e.message}`); }
}
