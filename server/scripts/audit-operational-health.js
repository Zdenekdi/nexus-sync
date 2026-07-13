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

  // ── [3] Admin operational health ────────────────────────────────────────────
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

  // ── [4] Active relay device bindings ────────────────────────────────────────
  try {
    const bindingsRes = await requester(buildUrl(apiBase, '/device/bindings'), {
      timeoutMs,
      headers: { Authorization: `Bearer ${token}` }
    });
    const bindings = Array.isArray(bindingsRes.body?.bindings)
      ? bindingsRes.body.bindings
      : Array.isArray(bindingsRes.body) ? bindingsRes.body : [];
    const activeBindings = bindings.filter((b) => b.active === true);

    if (bindingsRes.status >= 200 && bindingsRes.status < 300 && activeBindings.length > 0) {
      addCheck(summary, 'relay-device-bindings', 'ok',
        `${activeBindings.length} active device binding(s) found.`,
        { activeCount: activeBindings.length, totalCount: bindings.length }
      );
    } else if (bindingsRes.status >= 200 && bindingsRes.status < 300 && activeBindings.length === 0) {
      failIfNeeded(summary, strict, 'relay-device-bindings',
        'No active device bindings found. Relay cannot receive SMS/calls.',
        { totalCount: bindings.length }
      );
    } else {
      failIfNeeded(summary, strict, 'relay-device-bindings',
        `/device/bindings returned ${bindingsRes.status}.`,
        { httpStatus: bindingsRes.status }
      );
    }
  } catch (error) {
    failIfNeeded(summary, strict, 'relay-device-bindings',
      `/device/bindings request failed: ${error.message}`
    );
  }

  // ── [5] Relay outbox endpoint accessible ─────────────────────────────────────
  const relayProfileId = String(env.OPS_RELAY_PROFILE_ID || env.RELAY_PROFILE_ID || '').trim();
  const relayInstallationId = String(env.OPS_RELAY_INSTALLATION_ID || env.RELAY_INSTALLATION_ID || '').trim();

  if (relayProfileId && relayInstallationId) {
    try {
      const outboxUrl = buildUrl(
        apiBase,
        `/messages/outbox?profileId=${encodeURIComponent(relayProfileId)}&installationId=${encodeURIComponent(relayInstallationId)}`
      );
      const outboxRes = await requester(outboxUrl, {
        timeoutMs,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (outboxRes.status >= 200 && outboxRes.status < 300) {
        const pending = Array.isArray(outboxRes.body) ? outboxRes.body.length : 0;
        addCheck(summary, 'relay-outbox-accessible', 'ok',
          `Outbox accessible for profileId=${relayProfileId}. Pending: ${pending}.`,
          { pendingCount: pending }
        );
      } else {
        failIfNeeded(summary, strict, 'relay-outbox-accessible',
          `Outbox returned ${outboxRes.status} for profileId=${relayProfileId}.`,
          { httpStatus: outboxRes.status }
        );
      }
    } catch (error) {
      failIfNeeded(summary, strict, 'relay-outbox-accessible',
        `Outbox request failed: ${error.message}`
      );
    }

    // ── [6] Relay inbound smoke POST ─────────────────────────────────────────
    const deviceSecret = String(env.OPS_DEVICE_SECRET || env.DEVICE_SECRET || env.NEXUS_DEVICE_SECRET || '').trim();
    if (deviceSecret) {
      try {
        const smokeContent = `ops-smoke-${Date.now()}`;
        const relayRes = await requester(buildUrl(apiBase, '/device/relay'), {
          method: 'POST',
          timeoutMs,
          body: {
            installationId: relayInstallationId,
            type: 'sms',
            transport: 'sms',
            from: String(env.OPS_SMOKE_CALLER || env.SMOKE_CALLER_PHONE || '+420000000001').trim(),
            content: smokeContent,
            // Per-device relay secret (matches server deriveRelaySecret)
            secret: require('crypto').createHmac('sha256', deviceSecret).update(String(relayInstallationId)).digest('hex')
          }
        });

        if (relayRes.status === 200 && relayRes.body?.ok === true) {
          addCheck(summary, 'relay-inbound-smoke', 'ok',
            'Relay inbound smoke POST accepted and persisted.',
            { duplicate: relayRes.body?.duplicate === true }
          );
        } else {
          failIfNeeded(summary, strict, 'relay-inbound-smoke',
            `Relay inbound smoke returned ${relayRes.status}: ${JSON.stringify(relayRes.body)}`,
            { httpStatus: relayRes.status }
          );
        }
      } catch (error) {
        failIfNeeded(summary, strict, 'relay-inbound-smoke',
          `Relay inbound smoke request failed: ${error.message}`
        );
      }
    } else {
      addCheck(summary, 'relay-inbound-smoke', 'warning',
        'Skipped: OPS_DEVICE_SECRET / DEVICE_SECRET not configured.'
      );
    }
  } else {
    addCheck(summary, 'relay-outbox-accessible', 'warning',
      'Skipped: OPS_RELAY_PROFILE_ID and OPS_RELAY_INSTALLATION_ID not configured.'
    );
    addCheck(summary, 'relay-inbound-smoke', 'warning',
      'Skipped: OPS_RELAY_PROFILE_ID and OPS_RELAY_INSTALLATION_ID not configured.'
    );
  }

  // ── [7] DB message recency guard ────────────────────────────────────────────
  // Check that the /chats endpoint returns at least one chat with a recent message.
  // This acts as a proxy for DB write liveness.
  const maxMessageAgeDays = Number.parseInt(env.OPS_MAX_MESSAGE_AGE_DAYS || '14', 10);
  try {
    const chatsRes = await requester(buildUrl(apiBase, '/chats'), {
      timeoutMs,
      headers: { Authorization: `Bearer ${token}` }
    });
    const chats = Array.isArray(chatsRes.body) ? chatsRes.body : [];
    if (chatsRes.status >= 200 && chatsRes.status < 300 && chats.length > 0) {
      const latestTs = chats
        .map((c) => new Date(c.lastMessageAt || 0).getTime())
        .filter((t) => !Number.isNaN(t) && t > 0)
        .sort((a, b) => b - a)[0] || 0;
      const ageMs = Date.now() - latestTs;
      const ageDays = Math.floor(ageMs / 86_400_000);
      if (latestTs > 0 && ageDays <= maxMessageAgeDays) {
        addCheck(summary, 'db-message-recency', 'ok',
          `Most recent chat message is ${ageDays} day(s) old (threshold: ${maxMessageAgeDays} days).`,
          { ageDays }
        );
      } else {
        failIfNeeded(summary, strict, 'db-message-recency',
          latestTs > 0
            ? `Most recent message is ${ageDays} day(s) old — exceeds ${maxMessageAgeDays}-day threshold. Relay may be silently dropping messages.`
            : 'No messages with a valid timestamp found in any chat.',
          { ageDays: latestTs > 0 ? ageDays : null, thresholdDays: maxMessageAgeDays }
        );
      }
    } else if (chatsRes.status >= 200 && chats.length === 0) {
      addCheck(summary, 'db-message-recency', 'warning',
        'No chats found — cannot determine message recency.'
      );
    } else {
      failIfNeeded(summary, strict, 'db-message-recency',
        `/chats returned ${chatsRes.status}.`, { httpStatus: chatsRes.status }
      );
    }
  } catch (error) {
    failIfNeeded(summary, strict, 'db-message-recency',
      `/chats request failed: ${error.message}`
    );
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
