/**
 * trunkController.js — správa per-agenturních SIP trunků (BYOT) + DID mapování
 *
 * Každá agentura si konfiguruje vlastního VoIP providera (dle země). Příchozí
 * hovor přesměrovaný ze SIMky modelky na DID dorazí přes trunk do Asterisku a
 * přemostí se operátorovi (obousměrné audio, bez rootu, bez GSM hardware).
 *
 * Endpointy (vše manager+, agency-scoped):
 *   GET    /api/trunks                     — seznam trunků agentury (+ DIDy)
 *   POST   /api/trunks                     — vytvoř trunk
 *   PATCH  /api/trunks/:id                 — uprav trunk
 *   DELETE /api/trunks/:id                 — smaž trunk
 *   POST   /api/trunks/:id/dids            — přidej DID (number + profileId)
 *   DELETE /api/trunks/:trunkId/dids/:didId — odeber DID
 */

const prisma = require('../services/db');
const { encrypt, decrypt } = require('../services/sipEncryption');
const { regenerateAsteriskConfig } = require('../services/asteriskConfigGenerator');
const { isAppOwnerRole, isManagerRole } = require('../utils/authz');

function requireTrunkAdmin(req, res) {
  if (!isManagerRole(req.user?.role)) {
    res.status(403).json({ message: 'Insufficient permissions' });
    return false;
  }
  return true;
}

// Scope: App Owner vidí vše, ostatní jen svou agenturu.
function agencyScope(req, extra = {}) {
  const role = req.user?.role;
  const agencyId = req.user?.agencyId;
  if (isAppOwnerRole(role)) return extra;
  return { ...extra, agencyId: agencyId || '__none__' };
}

// Trunk bez šifrovaného hesla ven (nikdy nevracíme creds klientovi).
function sanitizeTrunk(t) {
  const { password, ...safe } = t;
  return { ...safe, hasPassword: Boolean(password) };
}

async function triggerRegen(agencyId) {
  try {
    await regenerateAsteriskConfig({ agencyId, decrypt });
  } catch (err) {
    console.error('[Trunk] Asterisk regenerace selhala (data uložena OK):', err.message);
  }
}

// ─── GET /api/trunks ──────────────────────────────────────────────────────────
exports.listTrunks = async (req, res) => {
  try {
    if (!requireTrunkAdmin(req, res)) return;
    const trunks = await prisma.sipTrunk.findMany({
      where: agencyScope(req),
      include: { dids: { include: { profile: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(trunks.map(sanitizeTrunk));
  } catch (err) {
    console.error('[Trunk] listTrunks error:', err);
    res.status(500).json({ message: 'Failed to list trunks' });
  }
};

// ─── POST /api/trunks ─────────────────────────────────────────────────────────
exports.createTrunk = async (req, res) => {
  try {
    if (!requireTrunkAdmin(req, res)) return;
    const { name, host, port, authMode, username, password, fromUser, codecs } = req.body || {};
    if (!name || !host) return res.status(400).json({ message: 'name and host are required' });

    // Agentura z tokenu — App Owner smí zvolit cílovou agenturu v těle.
    const agencyId = isAppOwnerRole(req.user?.role)
      ? (req.body.agencyId || req.user?.agencyId)
      : req.user?.agencyId;
    if (!agencyId) return res.status(400).json({ message: 'agencyId is required' });

    const trunk = await prisma.sipTrunk.create({
      data: {
        agencyId,
        name,
        host,
        port: port ? parseInt(port, 10) : 5060,
        authMode: authMode === 'ip' ? 'ip' : 'register',
        username: username || null,
        password: password ? await encrypt(password) : null,
        fromUser: fromUser || null,
        codecs: codecs || 'ulaw,alaw',
      },
    });

    await triggerRegen(agencyId);
    res.status(201).json(sanitizeTrunk(trunk));
  } catch (err) {
    console.error('[Trunk] createTrunk error:', err);
    res.status(500).json({ message: 'Failed to create trunk' });
  }
};

// ─── PATCH /api/trunks/:id ────────────────────────────────────────────────────
exports.updateTrunk = async (req, res) => {
  try {
    if (!requireTrunkAdmin(req, res)) return;
    const existing = await prisma.sipTrunk.findFirst({ where: agencyScope(req, { id: req.params.id }) });
    if (!existing) return res.status(404).json({ message: 'Trunk not found' });

    const { name, host, port, authMode, username, password, fromUser, codecs, active } = req.body || {};
    const data = {};
    if (name !== undefined) data.name = name;
    if (host !== undefined) data.host = host;
    if (port !== undefined) data.port = parseInt(port, 10) || 5060;
    if (authMode !== undefined) data.authMode = authMode === 'ip' ? 'ip' : 'register';
    if (username !== undefined) data.username = username || null;
    if (fromUser !== undefined) data.fromUser = fromUser || null;
    if (codecs !== undefined) data.codecs = codecs || 'ulaw,alaw';
    if (active !== undefined) data.active = Boolean(active);
    // Heslo měň jen když je v těle (prázdný řetězec = smazat).
    if (password !== undefined) data.password = password ? await encrypt(password) : null;

    const trunk = await prisma.sipTrunk.update({ where: { id: existing.id }, data });
    await triggerRegen(existing.agencyId);
    res.json(sanitizeTrunk(trunk));
  } catch (err) {
    console.error('[Trunk] updateTrunk error:', err);
    res.status(500).json({ message: 'Failed to update trunk' });
  }
};

// ─── DELETE /api/trunks/:id ───────────────────────────────────────────────────
exports.deleteTrunk = async (req, res) => {
  try {
    if (!requireTrunkAdmin(req, res)) return;
    const existing = await prisma.sipTrunk.findFirst({ where: agencyScope(req, { id: req.params.id }) });
    if (!existing) return res.status(404).json({ message: 'Trunk not found' });

    await prisma.sipTrunk.delete({ where: { id: existing.id } }); // DIDy padnou kaskádou
    await triggerRegen(existing.agencyId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Trunk] deleteTrunk error:', err);
    res.status(500).json({ message: 'Failed to delete trunk' });
  }
};

// ─── POST /api/trunks/:id/dids ────────────────────────────────────────────────
exports.addDid = async (req, res) => {
  try {
    if (!requireTrunkAdmin(req, res)) return;
    const { number, profileId } = req.body || {};
    if (!number) return res.status(400).json({ message: 'number is required' });

    const trunk = await prisma.sipTrunk.findFirst({ where: agencyScope(req, { id: req.params.id }) });
    if (!trunk) return res.status(404).json({ message: 'Trunk not found' });

    // Profil (pokud zadán) musí patřit stejné agentuře — zákaz cross-agency mapování.
    if (profileId) {
      const profile = await prisma.profile.findFirst({
        where: { id: profileId, agencyId: trunk.agencyId },
        select: { id: true },
      });
      if (!profile) return res.status(400).json({ message: 'Profile not found in this agency' });
    }

    const did = await prisma.sipDid.create({
      data: { trunkId: trunk.id, number, profileId: profileId || null },
    });
    await triggerRegen(trunk.agencyId);
    res.status(201).json(did);
  } catch (err) {
    if (err?.code === 'P2002') return res.status(409).json({ message: 'DID already exists on this trunk' });
    console.error('[Trunk] addDid error:', err);
    res.status(500).json({ message: 'Failed to add DID' });
  }
};

// ─── DELETE /api/trunks/:trunkId/dids/:didId ──────────────────────────────────
exports.deleteDid = async (req, res) => {
  try {
    if (!requireTrunkAdmin(req, res)) return;
    const trunk = await prisma.sipTrunk.findFirst({ where: agencyScope(req, { id: req.params.trunkId }) });
    if (!trunk) return res.status(404).json({ message: 'Trunk not found' });

    const result = await prisma.sipDid.deleteMany({ where: { id: req.params.didId, trunkId: trunk.id } });
    if (result.count === 0) return res.status(404).json({ message: 'DID not found' });
    await triggerRegen(trunk.agencyId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Trunk] deleteDid error:', err);
    res.status(500).json({ message: 'Failed to delete DID' });
  }
};
