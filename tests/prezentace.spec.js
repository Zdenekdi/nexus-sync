import { test, expect } from '@playwright/test';
import { setupApiMocks, setupOfflineMocks } from './helpers/mocks.js';

/**
 * Prezentace pro zájemce.
 *
 * Nejdůležitější věc, kterou tenhle soubor hlídá, není proklikávání snímků,
 * ale OBSAH: prezentace se stahuje jako PDF a koluje dál, takže do ní nesmí
 * proniknout funkce, které jsou v aplikaci zamčené (featureLocks.js). Přesně
 * tohle provinění se opravovalo na landingu — inzerovat sdílení polohy, které
 * je fail-closed zamčené.
 *
 * Druhá věc jsou ceny. Zrcadlí Stripe PLAN_MAP a musí sedět znak po znaku
 * s ceníkem na landingu; kdyby se rozešly, zájemce dostane jinou cenu
 * v PDF a jinou na webu.
 */

// Zamčené funkce podle client/src/config/featureLocks.js. Slova jsou volená
// tak, aby se trefila i do opisu, ne jen do přesného názvu.
const ZAKAZANA_SLOVA = [
  /sledov[áa]n[íi] polohy/i, /sd[íi]len[íi] polohy/i, /location shar/i, /live location/i, /GPS/i,
  /hlasov[ée] SOS/i, /voice SOS/i, /bezpe[čc]nostn[íi] slovo/i, /safe ?word/i,
  /fantomov[ýy] hovor/i, /ghost call/i,
  /automatick[ée] postov[áa]n[íi]/i, /auto.?post/i,
  /tracker/i,
];

// Ceny musí sedět s LandingPage.jsx (a ten se Stripe PLAN_MAP na serveru).
const CENY_CZ = ['290 Kč', '990 Kč', '2 490 Kč'];

// Prezentace je veřejná, takže se sem nechodí přes doLogin — a právě proto
// se musí `setupOfflineMocks` zavolat ručně. Bez něj testy míří na nasazený
// web (playwright.config.js: baseURL) a ověřují starou verzi. Napoprvé mi
// takhle spadlo všech sedm případů na kódu, který byl přitom v pořádku.
async function pripravVerejnouStranku(page) {
  await setupOfflineMocks(page);
  await setupApiMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem('nexus_hasSeenOnboarding', 'true');
    localStorage.setItem('nexus_onboarding_seen', 'true');
  });
}

async function otevriPrezentaci(page) {
  await pripravVerejnouStranku(page);
  await page.goto('/');
  await page.getByTestId('landing-deck-btn').click();
  await expect(page.getByTestId('prezentace-plocha')).toBeVisible({ timeout: 15000 });
}

test.describe('Prezentace pro zájemce', () => {
  test('otevře se z landingu a dá se proklikat', async ({ page }) => {
    await otevriPrezentaci(page);

    await expect(page.getByTestId('prezentace-pocitadlo')).toHaveText(/^1 /);
    await expect(page.getByTestId('prezentace-snimek-titul')).toBeVisible();

    await page.getByTestId('prezentace-dalsi').click();
    await expect(page.getByTestId('prezentace-pocitadlo')).toHaveText(/^2 /);
    await expect(page.getByTestId('prezentace-snimek-problem')).toBeVisible();

    await page.getByTestId('prezentace-predchozi').click();
    await expect(page.getByTestId('prezentace-pocitadlo')).toHaveText(/^1 /);
  });

  test('na prvním snímku nejde zpět, na posledním dál (kontrolní vzorek)', async ({ page }) => {
    // Bez tohohle by test výš prošel, i kdyby se index přetáčel dokola nebo
    // utekl mimo rozsah a snímek zmizel úplně.
    await otevriPrezentaci(page);
    await expect(page.getByTestId('prezentace-predchozi')).toBeDisabled();

    const posledni = await page.locator('[data-testid^="prezentace-snimek-"]').count();
    for (let i = 1; i < posledni; i += 1) {
      await page.getByTestId('prezentace-dalsi').click();
    }
    await expect(page.getByTestId('prezentace-pocitadlo')).toHaveText(new RegExp(`^${posledni} `));
    await expect(page.getByTestId('prezentace-dalsi')).toBeDisabled();
  });

  test('neinzeruje ani jednu zamčenou funkci', async ({ page }) => {
    // Jádro věci. Všechny snímky jsou v DOMu (kvůli tisku), takže stačí
    // přečíst celý text najednou — a právě proto to jde ohlídat.
    await otevriPrezentaci(page);

    const text = await page.locator('[data-testid^="prezentace-snimek-"]').allInnerTexts();
    const cely = text.join('\n');

    const nalezy = ZAKAZANA_SLOVA.filter((r) => r.test(cely)).map(String);
    expect({ nalezy, ukazka: cely.slice(0, 0) }).toEqual({ nalezy: [], ukazka: '' });
  });

  test('kontrolní vzorek: hlídač zamčených funkcí opravdu chytá', async ({ page }) => {
    // Kdyby test výš procházel proto, že se text nenačte, byl by k ničemu.
    // Tady se ověřuje, že v prezentaci JE co číst a že by se zákaz projevil.
    await otevriPrezentaci(page);

    const cely = (await page.locator('[data-testid^="prezentace-snimek-"]').allInnerTexts()).join('\n');
    expect(cely.length).toBeGreaterThan(1500);
    expect(ZAKAZANA_SLOVA.some((r) => r.test(`${cely}\nsdílení polohy`))).toBe(true);
  });

  test('ceny sedí s ceníkem na landingu', async ({ page }) => {
    await otevriPrezentaci(page);
    const cely = (await page.locator('[data-testid^="prezentace-snimek-"]').allInnerTexts()).join('\n');

    const chybejici = CENY_CZ.filter((c) => !cely.includes(c));
    expect({ chybejici }).toEqual({ chybejici: [] });
  });

  test('tlačítko pro stažení je k dispozici', async ({ page }) => {
    await otevriPrezentaci(page);
    await expect(page.getByTestId('prezentace-tisk')).toBeVisible();
  });

  test('přímý odkaz /prezentace funguje i po obnovení stránky', async ({ page }) => {
    // Veřejné cesty byly rozepsané na pěti místech zvlášť. Když se na jedno
    // zapomene, odkaz z navigace projde, ale po F5 spadne návštěvník do
    // přihlašovací obrazovky — a nikde to nevypíše chybu.
    await pripravVerejnouStranku(page);
    await page.goto('/prezentace');
    await expect(page.getByTestId('prezentace-plocha')).toBeVisible({ timeout: 15000 });
  });
});
