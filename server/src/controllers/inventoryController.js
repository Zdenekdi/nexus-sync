const prisma = require('../services/db');

// ── Helpers ──────────────────────────────────────────────────────────────────
const agencyGuard = (req) => {
  const { role, agencyId } = req.user;
  return role?.isAppOwner ? {} : { agencyId };
};

// ── Locations ─────────────────────────────────────────────────────────────────
exports.getLocations = async (req, res) => {
  try {
    const where = agencyGuard(req);
    const locs = await prisma.inventoryLocation.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(locs);
  } catch (e) {
    console.error('[Inventory] getLocations:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name required' });
    const agencyId = req.user.agencyId || null;
    const loc = await prisma.inventoryLocation.create({ data: { name: name.trim(), agencyId } });
    res.status(201).json(loc);
  } catch (e) {
    console.error('[Inventory] createLocation:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id, ...agencyGuard(req) };
    await prisma.inventoryLocation.delete({ where });
    res.json({ ok: true });
  } catch (e) {
    console.error('[Inventory] deleteLocation:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Items ─────────────────────────────────────────────────────────────────────
exports.getItems = async (req, res) => {
  try {
    const { locationId } = req.query;
    const agencyFilter = agencyGuard(req);
    const items = await prisma.inventoryItem.findMany({
      where: { ...agencyFilter, ...(locationId ? { locationId } : {}) },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (e) {
    console.error('[Inventory] getItems:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createItem = async (req, res) => {
  try {
    const { name, quantity = 0, threshold = 10, locationId } = req.body;
    if (!name?.trim() || !locationId) return res.status(400).json({ message: 'name + locationId required' });
    const agencyId = req.user.agencyId || null;
    const item = await prisma.inventoryItem.create({
      data: { name: name.trim(), quantity: Number(quantity), threshold: Number(threshold), locationId, agencyId },
      include: { location: { select: { id: true, name: true } } }
    });
    res.status(201).json(item);
  } catch (e) {
    console.error('[Inventory] createItem:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, threshold, locationId } = req.body;
    const agencyFilter = agencyGuard(req);
    const item = await prisma.inventoryItem.update({
      where: { id, ...agencyFilter },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(threshold !== undefined && { threshold: Number(threshold) }),
        ...(locationId !== undefined && { locationId })
      },
      include: { location: { select: { id: true, name: true } } }
    });
    res.json(item);
  } catch (e) {
    console.error('[Inventory] updateItem:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyFilter = agencyGuard(req);
    await prisma.inventoryItem.delete({ where: { id, ...agencyFilter } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[Inventory] deleteItem:', e);
    res.status(500).json({ message: 'Server error' });
  }
};
