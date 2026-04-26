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

            // 3. Injektáž řešení do stránky
            if (type === 'hcaptcha') {
                await page.evaluate((token) => {
                    // Vložíme token do skrytého pole
                    const inputs = document.querySelectorAll('[name="h-captcha-response"], [name="g-recaptcha-response"]');
                    inputs.forEach(el => el.innerHTML = token);
                    
                    // Pokud existuje callback, zavoláme ho
                    if (window.hcaptcha && window.hcaptcha.execute) {
                        // Většinou stačí jen vložit a odeslat formulář, ale některé weby vyžadují callback
                    }
                }, solution.gRecaptchaResponse);
            } else if (type === 'turnstile') {
                await page.evaluate((token) => {
                    const inputs = document.querySelectorAll('[name="cf-turnstile-response"]');
                    inputs.forEach(el => el.value = token);
                }, solution.token);
            }

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
