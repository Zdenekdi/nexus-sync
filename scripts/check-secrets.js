#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MAX_FILE_BYTES = 1024 * 1024;

const ignoredPathPatterns = [
  /^client\/android\/app\/build\//,
  /^client\/dist\//,
  /^coverage\//,
  /^playwright-report\//,
  /^test-results\//,
  /(^|\/)\.firebase\//,
  /(^|\/)package-lock\.json$/,
  /\.(png|jpe?g|gif|webp|ico|pdf|apk|zip|gz|tgz|jar|keystore|jks)$/i
];

const placeholderWords = [
  'changeme',
  'change_me',
  'configured',
  'example',
  'fake',
  'mock',
  'placeholder',
  'replace',
  'sample',
  'test-',
  'test-only',
  'your-',
  'your_',
  'dummy'
];

const exactPlaceholderValues = new Set([
  'password',
  '$db_password',
  '$database_url',
  '$device_secret',
  '$jwt_secret',
  '$encryption_key',
  'devicesecret12345'
]);

const PRIVATE_KEY_MARKER = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');

const rules = [
  {
    id: 'stripe-secret-key',
    regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g
  },
  {
    id: 'github-token',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{30,}\b/g
  },
  {
    id: 'slack-token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g
  },
  {
    id: 'firebase-private-key',
    regex: new RegExp(PRIVATE_KEY_MARKER, 'g')
  },
  {
    id: 'postgres-url-with-password',
    regex: /\bpostgres(?:ql)?:\/\/[^:\s/@]+:([^@\s]+)@/g,
    capture: 1
  },
  {
    id: 'inline-pgpassword',
    regex: /\bPGPASSWORD\s*=\s*['"]([^'"]{8,})['"]/g,
    capture: 1
  },
  {
    id: 'hardcoded-password',
    regex: /\bpassword\s*[:=]\s*['"]([^'"]{12,})['"]/gi,
    capture: 1,
    requireSecretLike: true
  },
  {
    id: 'hardcoded-secret-env',
    regex: /^\s*(?:export\s+)?(?:JWT_SECRET|DEVICE_SECRET|ENCRYPTION_KEY|STRIPE_SECRET_KEY|DEPLOY_PASSWORD|SSH_PASSWORD)\s*=\s*['"]?([^'"\s#]{16,})/gm,
    capture: 1
  },
  {
    id: 'hardcoded-process-env-secret',
    regex: /\bprocess\.env\.(?:JWT_SECRET|DEVICE_SECRET|ENCRYPTION_KEY|STRIPE_SECRET_KEY|DEPLOY_PASSWORD|SSH_PASSWORD)\s*=\s*['"]([^'"]{16,})['"]/g,
    capture: 1
  }
];

function isIgnored(file) {
  return ignoredPathPatterns.some((pattern) => pattern.test(file));
}

function isLikelyText(buffer) {
  if (buffer.includes(0)) return false;
  return true;
}

function isPlaceholder(value) {
  const lower = String(value || '').toLowerCase();
  return exactPlaceholderValues.has(lower) ||
    placeholderWords.some((word) => lower.includes(word)) ||
    /^x+$/.test(lower) ||
    /^\.+$/.test(lower) ||
    lower.startsWith('$') ||
    lower.includes(':latest') ||
    /^\$\{\{\s*secrets\./i.test(lower);
}

function isSecretLike(value) {
  const text = String(value || '');
  if (isPlaceholder(text)) return false;
  if (/\s/.test(text)) return false;
  const hasLower = /[a-z]/.test(text);
  const hasUpper = /[A-Z]/.test(text);
  const hasDigit = /\d/.test(text);
  const hasSymbol = /[^A-Za-z0-9]/.test(text);
  return text.length >= 12 && [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length >= 3;
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function scanFile(file) {
  const fullPath = path.join(ROOT, file);
  const stat = fs.statSync(fullPath);
  if (stat.size > MAX_FILE_BYTES) return [];

  const buffer = fs.readFileSync(fullPath);
  if (!isLikelyText(buffer)) return [];

  const content = buffer.toString('utf8');
  const findings = [];

  for (const rule of rules) {
    rule.regex.lastIndex = 0;
    let match;
    while ((match = rule.regex.exec(content)) !== null) {
      const value = rule.capture ? match[rule.capture] : match[0];
      if (isPlaceholder(value)) continue;
      if (rule.requireSecretLike && !isSecretLike(value)) continue;
      findings.push({
        file,
        line: lineNumberForIndex(content, match.index),
        rule: rule.id
      });
    }
  }

  return findings;
}

function main() {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => !isIgnored(file));

  const findings = files.flatMap(scanFile);

  if (findings.length > 0) {
    console.error('Potential secrets detected. Values are intentionally not printed.');
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line} (${finding.rule})`);
    }
    console.error('\nMove real values to environment variables or GitHub/runtime secrets.');
    process.exit(1);
  }

  console.log(`Secret scan passed (${files.length} tracked/non-ignored files checked).`);
}

main();
