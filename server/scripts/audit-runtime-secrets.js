#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function stripQuotes(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath) {
  const loaded = [];
  if (!filePath || !fs.existsSync(filePath)) return loaded;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match) continue;
    const key = match[1];
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    process.env[key] = stripQuotes(match[2]);
    loaded.push(key);
  }
  return loaded;
}

function loadDotenvCandidates() {
  if (process.env.NO_DOTENV === 'true') return [];

  const candidates = [
    process.env.RUNTIME_ENV_FILE,
    path.join(process.cwd(), '.env'),
    path.join(ROOT, '.env')
  ].filter(Boolean);

  const seen = new Set();
  const loadedFiles = [];
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    const loaded = loadEnvFile(resolved);
    if (loaded.length > 0) loadedFiles.push(resolved);
  }
  return loadedFiles;
}

function has(key) {
  return Boolean(String(process.env[key] || '').trim());
}

function value(key) {
  return String(process.env[key] || '').trim();
}

function redactedPresence(key) {
  return has(key) ? 'configured' : 'missing';
}

function addIssue(issues, level, key, message) {
  issues.push({ level, key, message });
}

function validateMinLength(issues, key, minLength, strict) {
  if (!has(key)) {
    addIssue(issues, strict ? 'error' : 'warning', key, `${key} is missing.`);
    return;
  }
  if (value(key).length < minLength) {
    addIssue(issues, 'error', key, `${key} is too short; expected at least ${minLength} characters.`);
  }
}

function validatePrefix(issues, key, prefixes) {
  if (!has(key)) return;
  if (!prefixes.some(prefix => value(key).startsWith(prefix))) {
    addIssue(issues, 'error', key, `${key} has an unexpected prefix.`);
  }
}

function validateRuntimeSecrets() {
  const loadedFiles = loadDotenvCandidates();
  const issues = [];
  const strict = process.env.STRICT_RUNTIME_SECRETS === 'true' || process.env.NODE_ENV === 'production';
  const productionLike = strict || process.env.NODE_ENV === 'production';

  validateMinLength(issues, 'JWT_SECRET', 32, strict);
  validateMinLength(issues, 'DEVICE_SECRET', 16, strict);
  validateMinLength(issues, 'ENCRYPTION_KEY', 32, strict);

  if (!has('DATABASE_URL')) {
    addIssue(issues, strict ? 'error' : 'warning', 'DATABASE_URL', 'DATABASE_URL is missing.');
  } else if (!/^postgres(?:ql)?:\/\//i.test(value('DATABASE_URL'))) {
    addIssue(issues, 'error', 'DATABASE_URL', 'DATABASE_URL must be a PostgreSQL connection string.');
  }

  const requireStripe = value('REQUIRE_STRIPE_CONFIG') === 'true';
  const stripeConfigured = has('STRIPE_SECRET_KEY') || has('STRIPE_PUBLISHABLE_KEY') || has('STRIPE_WEBHOOK_SECRET') || requireStripe;

  if (stripeConfigured) {
    for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET']) {
      if (!has(key)) {
        addIssue(issues, 'error', key, `${key} is required when Stripe billing is enabled.`);
      }
    }
  }

  validatePrefix(issues, 'STRIPE_SECRET_KEY', ['sk_test_', 'sk_live_']);
  validatePrefix(issues, 'STRIPE_PUBLISHABLE_KEY', ['pk_test_', 'pk_live_']);
  validatePrefix(issues, 'STRIPE_WEBHOOK_SECRET', ['whsec_']);

  if (has('STRIPE_SECRET_KEY') && has('STRIPE_PUBLISHABLE_KEY')) {
    const secretMode = value('STRIPE_SECRET_KEY').startsWith('sk_live_') ? 'live' : value('STRIPE_SECRET_KEY').startsWith('sk_test_') ? 'test' : null;
    const publishableMode = value('STRIPE_PUBLISHABLE_KEY').startsWith('pk_live_') ? 'live' : value('STRIPE_PUBLISHABLE_KEY').startsWith('pk_test_') ? 'test' : null;
    if (secretMode && publishableMode && secretMode !== publishableMode) {
      addIssue(issues, 'error', 'STRIPE_PUBLISHABLE_KEY', 'Stripe secret and publishable keys use different modes.');
    }
  }

  if (has('VITE_STRIPE_PUBLISHABLE_KEY') && has('STRIPE_PUBLISHABLE_KEY') && value('VITE_STRIPE_PUBLISHABLE_KEY') !== value('STRIPE_PUBLISHABLE_KEY')) {
    addIssue(issues, strict ? 'error' : 'warning', 'VITE_STRIPE_PUBLISHABLE_KEY', 'Frontend Stripe publishable key differs from backend publishable key.');
  }

  if (productionLike && value('ALLOW_UNSIGNED_BILLING_WEBHOOK') === 'true') {
    addIssue(issues, 'error', 'ALLOW_UNSIGNED_BILLING_WEBHOOK', 'Unsigned billing webhooks must not be enabled in production.');
  }

  if (productionLike && value('ALLOW_MOCK_BILLING') === 'true') {
    addIssue(issues, 'error', 'ALLOW_MOCK_BILLING', 'Mock billing must not be enabled in production.');
  }

  if (productionLike && value('ALLOW_BANK_TRANSFER_BILLING') === 'true') {
    addIssue(issues, 'warning', 'ALLOW_BANK_TRANSFER_BILLING', 'Bank transfer billing is disabled for the current pilot plan.');
  }

  if (productionLike && !has('FIREBASE_SERVICE_ACCOUNT_JSON') && !has('GOOGLE_APPLICATION_CREDENTIALS')) {
    addIssue(issues, 'warning', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'Firebase/FCM service account is not configured.');
  }

  if (has('TELEGRAM_BOT_TOKEN') !== has('TELEGRAM_CHAT_ID')) {
    addIssue(issues, 'warning', 'TELEGRAM_BOT_TOKEN', 'Telegram alert token/chat id must be configured together.');
  } else if (productionLike && !has('TELEGRAM_BOT_TOKEN')) {
    addIssue(issues, 'warning', 'TELEGRAM_BOT_TOKEN', 'Telegram monitoring alerts are not configured.');
  }

  if (productionLike && !has('SENTRY_DSN')) {
    addIssue(issues, 'warning', 'SENTRY_DSN', 'Sentry error tracking is not configured.');
  }

  const summary = {
    strict,
    loadedFiles,
    checked: {
      DATABASE_URL: redactedPresence('DATABASE_URL'),
      JWT_SECRET: redactedPresence('JWT_SECRET'),
      DEVICE_SECRET: redactedPresence('DEVICE_SECRET'),
      ENCRYPTION_KEY: redactedPresence('ENCRYPTION_KEY'),
      STRIPE_SECRET_KEY: redactedPresence('STRIPE_SECRET_KEY'),
      STRIPE_PUBLISHABLE_KEY: redactedPresence('STRIPE_PUBLISHABLE_KEY'),
      STRIPE_WEBHOOK_SECRET: redactedPresence('STRIPE_WEBHOOK_SECRET'),
      FIREBASE: has('FIREBASE_SERVICE_ACCOUNT_JSON') || has('GOOGLE_APPLICATION_CREDENTIALS') ? 'configured' : 'missing',
      TELEGRAM_ALERTS: has('TELEGRAM_BOT_TOKEN') && has('TELEGRAM_CHAT_ID') ? 'configured' : 'missing',
      BACKUP_DIR: has('BACKUP_DIR') ? 'configured' : 'default:/var/backups/nexus',
      RETENTION_DAYS: has('RETENTION_DAYS') ? 'configured' : 'default:14'
    },
    issues
  };

  return summary;
}

function main() {
  const summary = validateRuntimeSecrets();
  const errors = summary.issues.filter(issue => issue.level === 'error');
  const warnings = summary.issues.filter(issue => issue.level === 'warning');

  console.log('Runtime secret audit');
  console.log(`Mode: ${summary.strict ? 'strict' : 'advisory'}`);
  if (summary.loadedFiles.length > 0) {
    console.log(`Loaded env files: ${summary.loadedFiles.join(', ')}`);
  }
  for (const [key, state] of Object.entries(summary.checked)) {
    console.log(`- ${key}: ${state}`);
  }

  if (summary.issues.length > 0) {
    console.error('\nFindings:');
    for (const issue of summary.issues) {
      console.error(`- [${issue.level}] ${issue.key}: ${issue.message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\nRuntime secret audit failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
    process.exit(1);
  }

  console.log(`\nRuntime secret audit passed with ${warnings.length} warning(s).`);
}

if (require.main === module) {
  main();
}

module.exports = { validateRuntimeSecrets };
