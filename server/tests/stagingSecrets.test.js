/**
 * Pravidla pro testovací prostředí v auditu tajemství.
 *
 * Testovací server sdílí kód s produkcí, takže umí úplně totéž: strhnout
 * peníze, poslat push na skutečné telefony, spárovat bankovní platbu. Audit
 * ho k tomu nesmí pustit.
 *
 * Nejdůležitější případ je ale ten první: audit musí SCHVÁLIT přesně to
 * `.env`, které zapisuje .github/workflows/deploy-staging.yml. Kdyby ho
 * odmítl, nasazení testovacího serveru by padalo pokaždé — a přesně to se
 * stalo, protože ALLOW_MOCK_BILLING je na produkci zakázaný a testovací
 * server má NODE_ENV=production.
 */

const { validateRuntimeSecrets } = require('../scripts/audit-runtime-secrets');

// Vygenerovaná náhodná tajemství, ne opsaná odkudkoli.
const JWT = '1f3c9a7e5b2d8f4a6c0e9b3d7f1a5c8e2b6d0f4a9c3e7b1d5f9a2c6e0b4d8f3a';
const DEVICE = '9b2e6a0c4f8d1b5e7a3c9f2d6b0e4a8c';
const ENCRYPTION = '7d1b5f9c3e7a1d5b9f3c7e1a5d9b3f7c1e5a9d3b7f1c5e9a3d7b1f5c9e3a7d1b';

/** Přesně to, co zapisuje deploy-staging.yml. Když se změní tam, musí i tady. */
function envTestovacihoServeru(navic = {}) {
  return {
    NO_DOTENV: 'true',            // ať test nečte .env ze stroje, kde běží
    STRICT_RUNTIME_SECRETS: 'true',
    NODE_ENV: 'production',
    NEXUS_ENVIRONMENT: 'staging',
    PORT: '3001',
    DATABASE_URL: 'postgresql://localhost:5432/nexus_test',
    JWT_SECRET: JWT,
    DEVICE_SECRET: DEVICE,
    ENCRYPTION_KEY: ENCRYPTION,
    ALLOW_BANK_TRANSFER_BILLING: 'false',
    ALLOW_MOCK_BILLING: 'true',
    ALLOW_MESSAGE_SIMULATION: 'true',
    ...navic,
  };
}

function spustAudit(env) {
  const puvodni = process.env;
  process.env = { ...env };
  try {
    return validateRuntimeSecrets();
  } finally {
    process.env = puvodni;
  }
}

const chyby = (souhrn) => souhrn.issues.filter((i) => i.level === 'error').map((i) => i.key);

describe('audit tajemství — testovací prostředí', () => {
  it('schválí přesně to .env, které zapisuje nasazovací workflow', () => {
    expect(chyby(spustAudit(envTestovacihoServeru()))).toEqual([]);
  });

  it('předstíraná platba zůstává na PRODUKCI zakázaná (kontrolní vzorek)', () => {
    // Bez tohohle případu by výjimka pro testovací server mohla vypnout
    // zákaz úplně — a produkce by tiše přestala účtovat.
    const env = envTestovacihoServeru();
    delete env.NEXUS_ENVIRONMENT;
    expect(chyby(spustAudit(env))).toContain('ALLOW_MOCK_BILLING');
  });

  it('nepustí test k bankovnímu účtu', () => {
    const souhrn = spustAudit(envTestovacihoServeru({ FIO_API_TOKEN: 'cokoli' }));
    expect(chyby(souhrn)).toContain('FIO_API_TOKEN');
  });

  it('nepustí test k vydávání platebních pokynů', () => {
    const souhrn = spustAudit(envTestovacihoServeru({ ALLOW_BANK_TRANSFER_BILLING: 'true' }));
    expect(chyby(souhrn)).toContain('ALLOW_BANK_TRANSFER_BILLING');
  });

  it('nepustí test k ostrým Stripe klíčům', () => {
    const souhrn = spustAudit(envTestovacihoServeru({
      STRIPE_SECRET_KEY: 'sk_live_neco',
      STRIPE_PUBLISHABLE_KEY: 'pk_live_neco',
      STRIPE_WEBHOOK_SECRET: 'whsec_neco',
    }));
    expect(chyby(souhrn)).toContain('STRIPE_SECRET_KEY');
  });

  it('testovací Stripe klíče projdou (kontrolní vzorek)', () => {
    // Kdyby se zakazovaly všechny Stripe klíče, předchozí test by prošel
    // z nesprávného důvodu a objednávkový tok by nešlo na testu proklikat.
    const souhrn = spustAudit(envTestovacihoServeru({
      STRIPE_SECRET_KEY: 'sk_test_neco',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_neco',
      STRIPE_WEBHOOK_SECRET: 'whsec_neco',
    }));
    expect(chyby(souhrn)).not.toContain('STRIPE_SECRET_KEY');
  });

  it('nepustí test k pushům na skutečné telefony', () => {
    const souhrn = spustAudit(envTestovacihoServeru({
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"x","private_key":"y","client_email":"z"}',
    }));
    expect(chyby(souhrn)).toContain('FIREBASE_SERVICE_ACCOUNT_JSON');
  });
});
