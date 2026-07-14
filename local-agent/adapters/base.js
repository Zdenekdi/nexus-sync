// Sdílené helpery pro site-adaptéry (lidské psaní, detekce/přečkání Cloudflare).
//
// Filozofie proti Cloudflare: nebojovat, ale VYHNOUT SE mu. Reálný fingerprintovaný
// AdsPower prohlížeč na dobré (residenční/mobilní) proxy projde "managed/JS challenge"
// sám — stačí ji přečkat. Tvrdý ban (IP/ASN) přečkat nejde → hlásíme a končíme, ať
// se rotuje proxy. Captchu řešíme jen když se objeví (viz solver.js).

// Lidské psaní: vyčistí pole a píše znak po znaku s náhodnou prodlevou.
async function humanType(page, selector, text) {
  if (text == null) return;
  await page.focus(selector);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Meta+A'); // macOS
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(200);
  for (const ch of String(text)) {
    await page.type(selector, ch, { delay: Math.random() * 100 + 40 });
  }
}

// Rozliš stav Cloudflare: 'blocked' (tvrdý ban), 'challenge' (dočasná výzva), 'ok'.
async function cloudflareState(page) {
  const title = (await page.title().catch(() => '')) || '';
  const html = (await page.content().catch(() => '')) || '';
  if (/sorry, you have been blocked|error\s*102[0-9]|cf-error-details|access denied/i.test(html) ||
      /access denied|attention required/i.test(title)) {
    // "Attention Required" je hraniční — pokud je tam i challenge skript, ber jako výzvu.
    if (/challenge-platform|cf-browser-verification|turnstile/i.test(html) && !/have been blocked/i.test(html)) {
      return 'challenge';
    }
    return 'blocked';
  }
  if (/just a moment|checking your browser|one moment/i.test(title) ||
      /cf-browser-verification|challenge-platform|cf_chl_opt/i.test(html)) {
    return 'challenge';
  }
  return 'ok';
}

// Přečká Cloudflare výzvu (necháme reálný prohlížeč, ať ji projde). Vrací true = čisto.
async function passCloudflare(page, { log, timeout = 25000 } = {}) {
  const start = Date.now();
  let warned = false;
  while (Date.now() - start < timeout) {
    const st = await cloudflareState(page);
    if (st === 'ok') return true;
    if (st === 'blocked') {
      log?.('🔴 Cloudflare TVRDĚ zablokoval (ban IP/ASN) — nutná jiná (residenční) proxy v AdsPower profilu.');
      return false;
    }
    if (!warned) { log?.('⏳ Cloudflare výzva — čekám, až ji prohlížeč projde…'); warned = true; }
    await page.waitForTimeout(2000);
  }
  log?.('🔴 Cloudflare výzva nevypršela v limitu (zkontroluj proxy/fingerprint).');
  return false;
}

module.exports = { humanType, cloudflareState, passCloudflare };
