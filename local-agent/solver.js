const axios = require('axios');

/**
 * CapSolver Helper for Nexus Local Agent
 * Handles automated captcha solving for HCaptcha (OnlyFans) and Turnstile.
 */
class CaptchaSolver {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.capsolver.com';
    }

    async solve(page, type = 'hcaptcha') {
        if (!this.apiKey) {
            console.warn('⚠️ CapSolver: Chybí API klíč, přeskakuji automatické řešení.');
            return false;
        }

        try {
            const url = page.url();
            console.log(`🔍 CapSolver: Detekuji ${type} na ${url}...`);

            let siteKey = '';
            if (type === 'hcaptcha') {
                // Hledáme sitekey pro HCaptcha
                siteKey = await page.evaluate(() => {
                    const el = document.querySelector('[data-sitekey], .h-captcha');
                    return el ? (el.getAttribute('data-sitekey') || el.dataset.sitekey) : null;
                });
            } else if (type === 'turnstile') {
                // Hledáme sitekey pro Cloudflare Turnstile
                siteKey = await page.evaluate(() => {
                    const el = document.querySelector('[data-sitekey], .cf-turnstile');
                    return el ? (el.getAttribute('data-sitekey') || el.dataset.sitekey) : null;
                });
            }

            if (!siteKey) {
                console.log(`   -> Žádná ${type} nebyla detekována.`);
                return true; // Považujeme za vyřešené, pokud tam není
            }

            console.log(`   -> Detekován SiteKey: ${siteKey}. Žádám CapSolver o řešení...`);

            // 1. Vytvoření úkolu
            const createTask = await axios.post(`${this.baseUrl}/createTask`, {
                clientKey: this.apiKey,
                task: {
                    type: type === 'hcaptcha' ? 'HCaptchaTaskProxyless' : 'AntiTurnstileTaskProxyLess',
                    websiteURL: url,
                    websiteKey: siteKey
                }
            });

            if (createTask.data.errorId > 0) {
                throw new Error(`CapSolver Error: ${createTask.data.errorDescription}`);
            }

            const taskId = createTask.data.taskId;
            console.log(`   -> Úkol vytvořen (ID: ${taskId}). Čekám na výsledek...`);

            // 2. Polling pro výsledek
            let solution = null;
            for (let i = 0; i < 30; i++) { // Max 60 sekund (30 * 2s)
                await new Promise(r => setTimeout(r, 2000));
                const getResult = await axios.post(`${this.baseUrl}/getTaskResult`, {
                    clientKey: this.apiKey,
                    taskId: taskId
                });

                if (getResult.data.status === 'ready') {
                    solution = getResult.data.solution;
                    break;
                }
                if (getResult.data.status === 'failed') {
                    throw new Error('CapSolver task failed.');
                }
            }

            if (!solution) throw new Error('CapSolver timeout.');

            console.log('   -> ✅ Captcha vyřešena. Vkládám token...');

            // 3. Injektáž řešení do stránky. Jen nastavit hodnotu skrytého pole často
            //    nestačí — moderní widgety token přijmou až přes DATA-CALLBACK. Proto
            //    kromě value nastavíme i případný callback z data-callback atributu.
            const token = type === 'hcaptcha' ? solution.gRecaptchaResponse : solution.token;
            const fieldNames = type === 'hcaptcha'
                ? ['h-captcha-response', 'g-recaptcha-response']
                : ['cf-turnstile-response'];
            const widgetSelector = type === 'hcaptcha' ? '.h-captcha, [data-hcaptcha-widget-id]' : '.cf-turnstile';

            await page.evaluate(({ token, fieldNames, widgetSelector }) => {
                // a) vyplň skryté pole (textarea i input)
                for (const name of fieldNames) {
                    document.querySelectorAll(`[name="${name}"]`).forEach(el => {
                        el.value = token;
                        if ('innerHTML' in el) el.innerHTML = token;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }
                // b) zavolej data-callback widgetu (název funkce na window)
                const widget = document.querySelector(widgetSelector);
                const cbName = widget && widget.getAttribute('data-callback');
                if (cbName && typeof window[cbName] === 'function') {
                    try { window[cbName](token); } catch (_e) { /* ignore */ }
                }
            }, { token, fieldNames, widgetSelector });

            // Krátká pauza na zpracování
            await new Promise(r => setTimeout(r, 1000));
            return true;

        } catch (error) {
            console.error(`   ❌ CapSolver Error: ${error.message}`);
            return false;
        }
    }
}

module.exports = CaptchaSolver;
