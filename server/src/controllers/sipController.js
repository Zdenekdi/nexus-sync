/**
 * sipController.js — SIP credentials management + relay config distribution
 *
 * Endpointy:
 *   GET  /api/sip/config          — relay zařízení si stáhne vlastní SIP config (JWT auth)
 *                                   AUTO-PROVISIONING: pokud binding nemá credentials, vygeneruje je
 *   POST /api/sip/config/:bindingId — admin nastaví SIP credentials pro DeviceBinding
 *   DELETE /api/sip/config/:bindingId — admin smaže SIP credentials
 *   POST /api/sip/reset-config/:bindingId — reset credentials (nové auto-generated)
 *   GET  /api/sip/status          — stav SIP registrací per relay (ping table)
 */

const prisma         = require('../services/db');
const { encrypt, decrypt } = require('../services/sipEncryption');
const { getIO }      = require('../services/socket');
const { regenerateAsteriskConfig } = require('../services/asteriskConfigGenerator');
const crypto = require('crypto');
const { isAppOwnerRole, isManagerRole } = require('../utils/authz');

// ─── In-memory SIP status ping table ────────────────────────────────────────
// installationId → { registeredAt, lastPingAt, sipUser, profileName, agencyId }
const sipStatusMap = new Map();
// callMetaMap: from (caller number) → { profileName, profileId, agencyId, ts }
// Relay zařízení sem zapíše info o hovoru → web operátor ho přečte přes Socket.IO
const callMetaMap  = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateSipPassword(len = 20) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let password = '';
  for (let i = 0; i < len; i++) {
    password += chars[crypto.randomInt(0, chars.length)];
  }
  return password;
}

function requireSipAdmin(req, res) {
  if (!isManagerRole(req.user?.role)) {
    res.status(403).json({ message: 'Insufficient permissions' });
    return false;
  }
  return true;
}

// ─── GET /api/sip/config ─────────────────────────────────────────────────────
// Volá relay zařízení po přihlášení.
// AUTO-PROVISIONING: pokud binding ještě nemá SIP údaje, server je vygeneruje,
// uloží do DB a pošle příkaz k reloadu Asterisku — telefon dostane hotové credentials.
exports.getMyConfig = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const installationId = req.headers['x-installation-id'] || req.query.installationId;

    const binding = await prisma.deviceBinding.findFirst({
      where: {
        userId,
        ...(installationId ? { installationId } : {}),
        active: true,
      },
      select: {
        id:          true,
        sipUser:     true,
        sipPassword: true,
        sipServer:   true,
        sipPort:     true,
        installationId: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    if (!binding) {
      return res.json({ ok: true, sipConfig: null });
    }

    // Auto-provisioning: generate SIP credentials if binding has none
    if (!binding.sipUser) {
      const sipUser = `relay_${binding.installationId?.slice(-8) || Date.now().toString(36)}`;
      const sipPassword = generateSipPassword();
      const sipServer = process.env.SIP_SERVER || process.env.VPS_SSH_HOST || 'localhost';
      const sipPort = parseInt(process.env.SIP_PORT, 10) || 5060;

      await prisma.deviceBinding.update({
        where: { id: binding.id },
        data: {
          sipUser,
          sipPassword: await encrypt(sipPassword),
          sipServer,
          sipPort,
        },
      });

      // Regenerate Asterisk config to include the new endpoint
      try { await regenerateAsteriskConfig(); } catch (e) {
        console.warn('[SIP] Asterisk reload after auto-provision failed:', e.message);
      }

      return res.json({
        ok: true,
        sipConfig: {
          server:   sipServer,
          username: sipUser,
          password: sipPassword,
          port:     sipPort,
        },
      });
    }

    const plainPassword = decrypt(binding.sipPassword);
    if (!plainPassword) {
      console.error('[SIP] decrypt failed for binding:', binding.id);
      return res.status(500).json({ message: 'SIP configuration error. Please contact support.' });
    }

    return res.json({
      ok: true,
      sipConfig: {
        server:   binding.sipServer,
        username: binding.sipUser,
        password: plainPassword,
        port:     binding.sipPort || 5060,
      },
    });
  } catch (err) {
    console.error('[SIP] getMyConfig error:', err);
    return res.status(500).json({ message: 'Failed to load SIP configuration' });
  }
};

// ─── POST /api/sip/config/:bindingId ─────────────────────────────────────────
// Admin nastaví SIP credentials pro konkrétní DeviceBinding
exports.setConfig = async (req, res) => {
  try {
    if (!requireSipAdmin(req, res)) return;
    const { bindingId } = req.params;
    const { sipUser, sipPassword, sipServer, sipPort } = req.body || {};

    if (!sipUser || !sipPassword || !sipServer) {
      return res.status(400).json({ message: 'SIP username, password and server are required' });
    }

    // Validace agencyId — admin může měnit jen bindingy své agentury
    const agencyId = req.user?.agencyId;
    const role     = req.user?.role;
    const where    = { id: bindingId };
    if (!isAppOwnerRole(role) && agencyId) where.agencyId = agencyId;

    const binding = await prisma.deviceBinding.findFirst({ where, select: { id: true } });
    if (!binding) return res.status(404).json({ message: 'Device binding not found' });

    const encrypted = await encrypt(sipPassword);

    await prisma.deviceBinding.update({
      where: { id: bindingId },
      data: {
        sipUser,
        sipPassword: encrypted,
        sipServer,
        sipPort:    sipPort ? parseInt(sipPort, 10) : 5060,
      },
    });

    console.log(`[SIP] Config nastaven pro binding ${bindingId}: ${sipUser}@${sipServer}`);

    // Auto-regenerace Asterisk konfigurace z DB + SSH deploy
    try {
      const result = await regenerateAsteriskConfig({ agencyId, decrypt });
      if (result.ok) {
        console.log('[Asterisk] Config úspěšně obnoven:', result.dryRun ? '(dry-run)' : 'nasazen na VPS');
      }
    } catch (err) {
      console.error('[Asterisk] Regenerace selhala (SIP credentials uloženy OK):', err.message);
    }

    return res.json({ ok: true, message: 'SIP configuration saved' });
  } catch (err) {
    console.error('[SIP] setConfig error:', err);
    return res.status(500).json({ message: 'Failed to save SIP configuration' });
  }
};

// ─── DELETE /api/sip/config/:bindingId ───────────────────────────────────────
exports.deleteConfig = async (req, res) => {
  try {
    if (!requireSipAdmin(req, res)) return;
    const { bindingId } = req.params;
    const agencyId = req.user?.agencyId;
    const role     = req.user?.role;
    const where    = { id: bindingId };
    if (!isAppOwnerRole(role) && agencyId) where.agencyId = agencyId;

    const binding = await prisma.deviceBinding.findFirst({ where, select: { id: true } });
    if (!binding) return res.status(404).json({ message: 'Device binding not found' });

    await prisma.deviceBinding.update({
      where: { id: bindingId },
      data: { sipUser: null, sipPassword: null, sipServer: null, sipPort: null },
    });

    sipStatusMap.delete(bindingId);

    // Auto-regenerace po smazání
    try {
      await regenerateAsteriskConfig({ agencyId, decrypt });
    } catch (err) {
      console.error('[Asterisk] Regenerace po delete selhala:', err.message);
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete SIP configuration' });
  }
};

// ─── POST /api/sip/reset-config/:bindingId ────────────────────────────────────
// Vymaže SIP credentials pro daný binding → při příštím GET /api/sip/config
// proběhne auto-provisioning (nový user + nové heslo).
// Určeno pro adminy nebo selbytnou resetovací akci v dashboardu.
exports.resetConfig = async (req, res) => {
  try {
    if (!requireSipAdmin(req, res)) return;
    const { bindingId } = req.params;
    const agencyId = req.user?.agencyId;
    const role     = req.user?.role;
    const where    = { id: bindingId };
    if (!isAppOwnerRole(role) && agencyId) where.agencyId = agencyId;

    const binding = await prisma.deviceBinding.findFirst({ where, select: { id: true, agencyId: true } });
    if (!binding) return res.status(404).json({ message: 'Device binding not found' });

    await prisma.deviceBinding.update({
      where: { id: bindingId },
      data: { sipUser: null, sipPassword: null, sipServer: null, sipPort: null },
    });

    sipStatusMap.delete(bindingId);
    console.log(`[SIP] 🔄 Reset credentials pro binding ${bindingId} — auto-provisioning při příštím připojení`);

    return res.json({ ok: true, message: 'Credentials reset. New ones will be generated on next device connection.' });
  } catch (err) {
    console.error('[SIP] resetConfig error:', err);
    return res.status(500).json({ message: 'Failed to reset SIP credentials' });
  }
};

// ─── POST /api/sip/status/ping ───────────────────────────────────────────────
// Relay zařízení pošle ping každých 30s + při příchozím hovoru přidá callerInfo
exports.ping = async (req, res) => {
  try {
    const userId         = req.user?.userId;
    const installationId = req.headers['x-installation-id'] || req.body?.installationId;
    const { sipUser, incomingCall } = req.body || {};

    if (!userId || !installationId) {
      return res.status(400).json({ ok: false, message: 'Missing userId or installationId' });
    }

    const now = new Date();

    // Stáhni profil pro toto binding (pro identifikaci modelky)
    const binding = await prisma.deviceBinding.findFirst({
      where:  { installationId, userId },
      select: { agencyId: true, profile: { select: { id: true, name: true } } },
    });
    const profileName = binding?.profile?.name || null;
    const profileId   = binding?.profile?.id   || null;
    const agencyId    = binding?.agencyId       || null;

    sipStatusMap.set(installationId, {
      userId, sipUser: sipUser || '', agencyId, profileName,
      registeredAt: sipStatusMap.get(installationId)?.registeredAt || now,
      lastPingAt:   now,
    });

    await prisma.deviceBinding.updateMany({
      where: { installationId, userId },
      data:  { lastSeenAt: now },
    });

    // ─ Příchozí hovor notifikace ─────────────────────────────────────────
    // Android relay při přijetí SIP INVITE přidá { incomingCall: { from } }
    // Backend pak emituje Socket.IO event do dashboardu s jménem modelky
    if (incomingCall?.from && agencyId) {
      const from = incomingCall.from;
      callMetaMap.set(from, { profileName, profileId, agencyId, ts: Date.now() });

      // Persist to CallLog
      try {
        await prisma.callLog.create({
          data: { profileId, from, status: 'incoming', duration: 0 }
        });
      } catch (logErr) {
        console.warn('[SIP] CallLog create failed:', logErr.message);
      }

      try {
        getIO().to(`agency_${agencyId}`).emit('sip_incoming_call', {
          from,
          profileName,
          profileId,
          relayExtension: sipUser || '',
          deviceName:     installationId,
        });
        console.log(`[SIP] 📞 Příchozí hovor pro modelku '${profileName}' od ${from} → emit sip_incoming_call`);
      } catch (e) {
        console.warn('[SIP] Socket emit failed for sip_incoming_call:', e.message);
      }
    }

    return res.json({ ok: true, profileName });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET /api/sip/call-meta ──────────────────────────────────────────────────
// Web operátor přečte metadata o probíhajícím hovoru (jméno modelky) dle caller čísla
exports.getCallMeta = async (req, res) => {
  try {
    const from = req.query.from;
    if (!from) return res.status(400).json({ ok: false });

    // Vyčisti staré záznamy (> 5 minut)
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [k, v] of callMetaMap) { if (v.ts < cutoff) callMetaMap.delete(k); }

    const meta = callMetaMap.get(from);
    if (meta && !isAppOwnerRole(req.user?.role) && String(meta.agencyId) !== String(req.user?.agencyId)) {
      return res.status(403).json({ ok: false, message: 'Access denied' });
    }
    return res.json({ ok: true, meta: meta || null });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
};

// ─── GET /api/sip/status ─────────────────────────────────────────────────────
// Dashboard — stav všech relay zařízení
exports.getStatus = async (req, res) => {
  try {
    const agencyId = req.user?.agencyId;
    const role     = req.user?.role;

    const bindings = await prisma.deviceBinding.findMany({
      where: {
        active:   true,
        sipUser:  { not: null },
        ...(!isAppOwnerRole(role) && agencyId ? { agencyId } : {}),
      },
      select: {
        id:             true,
        installationId: true,
        deviceName:     true,
        sipUser:        true,
        sipServer:      true,
        lastSeenAt:     true,
        profile:        { select: { name: true } },
      },
    });

    const STALE_THRESHOLD_MS = 90_000; // 90s bez pingu = offline
    const now = Date.now();

    const result = bindings.map(b => {
      const ping = sipStatusMap.get(b.installationId);
      const lastPing = ping?.lastPingAt?.getTime() ?? 0;
      const online   = now - lastPing < STALE_THRESHOLD_MS;

      return {
        bindingId:   b.id,
        deviceName:  b.deviceName || b.installationId,
        profileName: b.profile?.name || null,
        sipUser:     b.sipUser,
        sipServer:   b.sipServer,
        online,
        lastPingAt:  ping?.lastPingAt || null,
        registeredAt: ping?.registeredAt || null,
      };
    });

    return res.json({ ok: true, relays: result });
  } catch (err) {
    console.error('[SIP] getStatus error:', err);
    return res.status(500).json({ message: 'Failed to load SIP status' });
  }
};

// ─── POST /api/sip/reload-asterisk ───────────────────────────────────────────
// Admin: manuálně zregeneruje Asterisk konfiguraci z DB a nasadí na VPS
exports.reloadAsterisk = async (req, res) => {
  try {
    const role     = req.user?.role;
    const agencyId = req.user?.agencyId;

    if (!requireSipAdmin(req, res)) return;

    console.log(`[Asterisk] Manuální reload spuštěn uživatelem ${req.user?.userId} (${role})`);

    const result = await regenerateAsteriskConfig({
      agencyId: isAppOwnerRole(role) ? null : agencyId, // App Owner vidi vse
      decrypt,
    });

    if (result.skipped) {
      return res.json({ ok: true, message: 'Žádná SIP zařízení v DB', skipped: true });
    }
    if (result.dryRun) {
      return res.json({
        ok:      true,
        dryRun:  true,
        message: 'Konfigurace vygenerována (VPS_SSH_HOST není nastaven — dry-run)',
        pjsipConf:      result.pjsipConf,
        extensionsConf: result.extensionsConf,
      });
    }

    return res.json({ ok: true, message: 'Asterisk konfigurece nasazena a reloadována', output: result.output });
  } catch (err) {
    console.error('[SIP] reloadAsterisk error:', err);
    return res.status(500).json({ message: 'Asterisk reload failed. Please try again.' });
  }
};
