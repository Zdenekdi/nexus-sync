import { expect } from '@playwright/test';
import { setupOfflineMocks } from './mocks.js';

/**
 * Common login helper for UI tests.
 * Handles onboarding automatically if present.
 */
export async function doLogin(page, email, password) {
  console.log(`🔑 UI Login: ${email}...`);

  // Setup local offline routing and mocks before any navigation
  await setupOfflineMocks(page);

  // Navigate to root - but first ensure onboarding won't block the login form
  // by pre-seeding localStorage flags that NexusContext checks on load
  await page.addInitScript(() => {
    localStorage.setItem('nexus_hasSeenOnboarding', 'true');
    localStorage.setItem('nexus_onboarding_seen', 'true');
  });

  await page.goto('/login', { waitUntil: 'load', timeout: 60000 }).catch(() => page.goto('/', { waitUntil: 'load' }));

  // Wait for either the login form or the onboarding screen
  // We use a combination of test-ids and roles for maximum robustness
  const emailInput = page.getByTestId('login-email');
  const passwordInput = page.getByTestId('login-password');
  const submitBtn = page.getByTestId('login-submit');
  
  // Potential landing/onboarding elements
  // .first() patří na CELÝ or(), ne jen na textovou větev: testid sedí na hero CTA,
  // ale stejný text nese i tlačítko v hlavičce, takže or() vidí dva různé prvky a ve
  // strict módu vyhodí výjimku. Tu by spolkl .catch(() => false) níž a helper by
  // landing tiše přeskočil.
  const enterBtn = page.getByTestId('landing-enter-btn').or(page.getByText(/vstoupit do aplikace|enter application|open nexus|otevřít nexus/i)).first();
  const nextBtn = page.getByRole('button', { name: /pokračovat|continue/i }).first();
  const skipBtn = page.getByTestId('onboarding-skip').or(page.getByRole('button', { name: /přeskočit|skip/i }).first());
  const finishBtn = page.getByTestId('onboarding-finish').or(page.getByRole('button', { name: /dokončit|finish/i }).first());

  // Fast settle: wait for critical elements instead of fixed 2s
  await page.waitForSelector('body', { state: 'attached' });
  
  if (await enterBtn.isVisible().catch(() => false)) {
    console.log('🚀 Landing page detected, clicking enter...');
    await enterBtn.click();
    // Wait for login screen to appear
    await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('⚠️ Login screen did not appear after clicking enter, retrying click...');
      return enterBtn.click();
    });
  }

  // Handle Onboarding flow
  if (await skipBtn.isVisible().catch(() => false)) {
    console.log('⏭️  Skipping onboarding...');
    await skipBtn.click();
  } else if (await nextBtn.isVisible().catch(() => false)) {
    console.log('📖 Stepping through onboarding slides...');
    let safety = 0;
    while (safety < 10 && await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      safety++;
    }
    // Check for finish button
    if (await finishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await finishBtn.click();
    }
  }

  // Final wait for login form
  console.log('📧 Entering credentials...');
  await page.waitForSelector('[data-testid="login-email"]', { state: 'visible', timeout: 15000 });
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');

  // Verify successful login (wait for dashboard elements).
  // Login dělá hard nav na /dashboard → full reload + hydratace dat; na CI pod
  // zátěží to bývá pomalé, proto štědré timeouty (dřív 30s → občas flakoval i po
  // 2 retry). Toto je hlavní příčina flaky rbac.spec.js loginu.
  console.log('🛰️ Verifying dashboard access...');
  await expect(emailInput).not.toBeVisible({ timeout: 45000 });

  // Wait for either desktop sidebar, mobile bottom nav, or mobile hamburger menu
  // (this is the authoritative "logged in" signal and yields a clear error on failure).
  const dashboardElement = page.locator('nav, .mobile-bottom-nav, [data-testid="page-safety-container"], button .lucide-menu, .lucide-menu').first();
  await dashboardElement.waitFor({ state: 'attached', timeout: 60000 });

  console.log(`✅ UI Login Success: ${email}`);
}

/**
 * Na telefonu je postranní navigace v zásuvce — otevře ji, pokud je zavřená.
 *
 * Bez tohohle hledaly mobilní testy `nav-link-*`, které na Pixelu 5 nejsou
 * vidět, dokud se nesáhne na hamburger. Celý mobilní projekt kvůli tomu padal
 * a nikdo si toho nevšiml, protože CI ty specy vůbec nepouštělo.
 */
export async function openMobileSidebar(page, testInfo) {
  if (testInfo?.project?.name !== 'mobile') return;
  const menu = page.locator('button:has(.lucide-menu), .lucide-menu').first();
  if (await menu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await menu.click();
    await page.waitForTimeout(700);
  }
}

/**
 * Nadpisy `h1`/`h2` schovává pod 768 px globální pravidlo v index.css —
 * na mobilu se titulek pohledu ukazuje v horní liště. Test na „vykreslilo se
 * to bez pádu" tedy nemůže na telefonu čekat viditelnost; stačí, že je prvek
 * ve stromu.
 */
export async function expectRendered(page, expect, selector, testInfo) {
  const el = page.locator(selector);
  if (testInfo?.project?.name === 'mobile') {
    await el.waitFor({ state: 'attached', timeout: 15000 });
  } else {
    await expect(el).toBeVisible({ timeout: 15000 });
  }
}
