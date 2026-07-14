require('dotenv').config();
const { io } = require("socket.io-client");
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createCursor } = require('ghost-cursor');
const axios = require('axios');
const CaptchaSolver = require('./solver');
const { getAdapter } = require('./adapters');

chromium.use(StealthPlugin());

const { checkAdsPower } = require('./setup');

// socket drží modulový scope, aby na něj dosáhly i runnery (emit completion eventů).
let socket = null;

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

    socket = io(BACKEND_URL, {
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

// Otevře prohlížeč a vrátí { browser, page, cursor } připravené pro adaptér.
async function openWorkspace(adsPowerId) {
    const browser = await openAdsPowerBrowser(adsPowerId);
    const context = browser.contexts()[0];
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    const cursor = createCursor(page);
    return { browser, page, cursor };
}

// SYNC — projde platformy přes registr adaptérů (updateBio). Přidání stránky =
// nový soubor v adapters/, žádná změna zde.
async function runMasterSync(payload) {
    const { adsPowerId, credentials, bio, platforms, profileId } = payload;
    if (!adsPowerId) return console.error("❌ Chybí AdsPower ID.");

    try {
        console.log(`🔧 Startuji prohlížeč (ID: ${adsPowerId})`);
        const { page, cursor } = await openWorkspace(adsPowerId);

        const results = [];
        for (const platform of platforms || []) {
            const adapter = getAdapter(platform);
            if (!adapter || typeof adapter.updateBio !== 'function') {
                console.warn(`   ⚠️  Platforma '${platform}' nemá sync adaptér — přeskakuji.`);
                results.push({ platform, ok: false, reason: 'no_adapter' });
                continue;
            }
            console.log(`🤖 Pracuji na: ${String(platform).toUpperCase()}`);
            const ctx = {
                page, cursor, solver, bio,
                creds: credentials ? credentials[platform] : null,
                log: (m) => console.log(`   [${platform}] ${m}`),
            };
            try {
                const ok = await adapter.updateBio(ctx);
                results.push({ platform, ok: ok !== false });
            } catch (e) {
                console.error(`   ! ${platform} error: ${e.message}`);
                results.push({ platform, ok: false, reason: e.message });
            }
        }

        console.log("✅ Sync dokončen.");
        // Zpětná vazba do UI (skutečný stav, ne simulovaný). Browser nezavíráme.
        socket?.emit('relay_event', { type: 'SYNC_COMPLETED', profileId, platforms, results });
    } catch (err) {
        console.error(`🔴 Chyba syncu: ${err.message}`);
        socket?.emit('relay_event', { type: 'SYNC_FAILED', profileId, error: err.message });
    }
}

// BOOST — "organická aktivita" přes adapter.boost (volitelné per stránka).
async function runMasterBoost(payload) {
    const { adsPowerId, credentials, platform, settings, profileId } = payload;
    if (!adsPowerId) return console.error("❌ Chybí AdsPower ID.");

    const adapter = getAdapter(platform);
    if (!adapter || typeof adapter.boost !== 'function') {
        return console.warn(`⚠️  Platforma '${platform}' nemá boost adaptér.`);
    }

    try {
        const { page, cursor } = await openWorkspace(adsPowerId);
        const ctx = {
            page, cursor, solver, settings,
            creds: credentials ? credentials[platform] : null,
            log: (m) => console.log(`   [${platform}] ${m}`),
        };
        const ok = await adapter.boost(ctx);
        console.log(`✅ Boost pro ${platform} dokončen.`);
        socket?.emit('relay_event', { type: 'BOOST_COMPLETED', profileId, platform, ok: ok !== false });
    } catch (err) {
        console.error(`🔴 Chyba boostu: ${err.message}`);
        socket?.emit('relay_event', { type: 'BOOST_FAILED', profileId, platform, error: err.message });
    }
}
