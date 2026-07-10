#!/usr/bin/env node

const http = require('http');
const https = require('https');

function envBool(env, key) {
  return String(env[key] || '').toLowerCase() === 'true';
}

function normalizeApiBase(rawBase) {
  const base = String(rawBase || '').trim() || 'http://localhost:5000/api';
  return base.replace(/\/+$/, '');
}

function buildUrl(base, path) {
  return `${normalizeApiBase(base)}${path.startsWith('/') ? path : `/${path}`}`;
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function requestJson(url, options = {}) {
  const method = options.method || 'GET';
  const timeoutMs = options.timeoutMs || 15_000;
  const body = options.body ? JSON.stringify(options.body) : null;
  const headers = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
    ...(options.headers || {})
  };

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request(
      parsed,
      { method, headers, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: safeJsonParse(text),
            rawBody: text
          });
        });
      }
    );

    req.on('timeout', () => req.destroy(new Error(`Request timed out after ${timeoutMs}ms`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function addCheck(summary, name, level, message, details = {}) {
  summary.checks.push({ name, level, message, details });
}

function failIfNeeded(summary, strict, name, message, details) {
  addCheck(summary, name, strict ? 'error' : 'warning', message, details);
}

async function runOperationalSmoke(options = {}) {
  const env = options.env || process.env;
  const requester = options.requestJson || requestJson;
  const strict = envBool(env, 'STRICT_OPERATIONAL_HEALTH') || envBool(env, 'EXPECT_OPERATIONAL_HEALTH_OK');
  const apiBase = normalizeApiBase(env.OPS_API_BASE_URL || env.NEXUS_API_URL || env.API_BASE_URL);
  const timeoutMs = Number.parseInt(env.OPS_TIMEOUT_MS || '15000', 10);
  const ownerEmail = String(env.OPS_OWNER_EMAIL || env.TEST_OWNER_EMAIL || '').trim();
  const ownerPassword = String(env.OPS_OWNER_PASSWORD || env.TEST_OWNER_PASSWORD || '').trim();
  const summary = {
    strict,
    apiBase,
    checks: []
  };

  try {
    const health = await requester(buildUrl(apiBase, '/health'), { timeoutMs });
    if (health.status >= 200 && health.status < 300 && (!health.body?.status || health.body.status === 'ok')) {
      addCheck(summary, 'public-health', 'ok', `/health returned ${health.status}.`);
    } else {
      addCheck(summary, 'public-health', 'error', `/health returned an unhealthy response.`, {
        httpStatus: health.status,
        status: health.body?.status || null
      });
    }
  } catch (error) {
    addCheck(summary, 'public-health', 'error', `/health request failed: ${error.message}`);
  }

  if (!ownerEmail || !ownerPassword) {
    failIfNeeded(
      summary,
      strict,
      'app-owner-login',
      'App Owner smoke credentials are missing. Set OPS_OWNER_EMAIL/OPS_OWNER_PASSWORD or TEST_OWNER_EMAIL/TEST_OWNER_PASSWORD.'
    );
    return summary;
  }

  let token = null;
  try {
    const login = await requester(buildUrl(apiBase, '/auth/login'), {
      method: 'POST',
      timeoutMs,
      body: { email: ownerEmail, password: ownerPassword }
    });

    token = login.body?.token || null;
    if (login.status >= 200 && login.status < 300 && token) {
      addCheck(summary, 'app-owner-login', 'ok', 'App Owner login returned an access token.');
      if (login.body?.user && login.body.user.isAppOwner !== true) {
        addCheck(summary, 'app-owner-role', 'error', 'Smoke user is not an App Owner.');
      }
    } else {
      addCheck(summary, 'app-owner-login', 'error', 'App Owner login failed.', { httpStatus: login.status });
    }
  } catch (error) {
    addCheck(summary, 'app-owner-login', 'error', `App Owner login request failed: ${error.message}`);
  }

  if (!token) return summary;

  try {
    const operational = await requester(buildUrl(apiBase, '/admin/operational-health'), {
      timeoutMs,
      headers: { Authorization: `Bearer ${token}` }
    });
    const reportStatus = operational.body?.status || null;

    if (operational.status >= 200 && operational.status < 300 && reportStatus === 'ok') {
      addCheck(summary, 'operational-health', 'ok', '/api/admin/operational-health returned ok.');
    } else {
      failIfNeeded(summary, strict, 'operational-health', '/api/admin/operational-health is not ok.', {
        httpStatus: operational.status,
        status: reportStatus
      });
    }
  } catch (error) {
    failIfNeeded(summary, strict, 'operational-health', `/api/admin/operational-health request failed: ${error.message}`);
  }

  return summary;
}

function printSummary(summary) {
  console.log('Operational health smoke');
  console.log(`Mode: ${summary.strict ? 'strict' : 'advisory'}`);
  console.log(`API base: ${summary.apiBase}`);

  for (const check of summary.checks) {
    const marker = check.level === 'ok' ? 'ok' : check.level;
    console.log(`- [${marker}] ${check.name}: ${check.message}`);
  }
}

async function main() {
  const summary = await runOperationalSmoke();
  printSummary(summary);

  const errors = summary.checks.filter((check) => check.level === 'error');
  if (errors.length > 0) {
    console.error(`\nOperational smoke failed with ${errors.length} error(s).`);
    process.exit(1);
  }

  const warnings = summary.checks.filter((check) => check.level === 'warning');
  console.log(`\nOperational smoke passed with ${warnings.length} warning(s).`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Operational smoke failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildUrl,
  normalizeApiBase,
  requestJson,
  runOperationalSmoke
};
