const path = require('path');
const { spawnSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', 'scripts', 'audit-runtime-secrets.js');

function runAudit(extraEnv = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    env: {
      PATH: process.env.PATH,
      NO_DOTENV: 'true',
      ...extraEnv
    },
    encoding: 'utf8'
  });
}

function validCoreEnv() {
  return {
    NODE_ENV: 'production',
    STRICT_RUNTIME_SECRETS: 'true',
    DATABASE_URL: 'postgresql://nexus:password@localhost:5432/nexus',
    JWT_SECRET: 'j'.repeat(64),
    DEVICE_SECRET: 'd'.repeat(32),
    ENCRYPTION_KEY: 'e'.repeat(64)
  };
}

describe('runtime secret audit', () => {
  it('passes strict mode with core and Stripe test-mode secrets configured', () => {
    const result = runAudit({
      ...validCoreEnv(),
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_fake',
      STRIPE_WEBHOOK_SECRET: 'whsec_fake'
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Runtime secret audit passed');
    expect(result.stdout).toContain('STRIPE_WEBHOOK_SECRET: configured');
  });

  it('fails strict mode when Stripe is missing webhook verification or dev billing flags are enabled', () => {
    const result = runAudit({
      ...validCoreEnv(),
      STRIPE_SECRET_KEY: 'sk_test_fake',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_fake',
      ALLOW_UNSIGNED_BILLING_WEBHOOK: 'true',
      ALLOW_MOCK_BILLING: 'true'
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('STRIPE_WEBHOOK_SECRET');
    expect(result.stderr).toContain('ALLOW_UNSIGNED_BILLING_WEBHOOK');
    expect(result.stderr).toContain('ALLOW_MOCK_BILLING');
  });
});
