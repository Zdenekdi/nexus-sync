const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');

const prisma = new PrismaClient();

// Plan durations in days
const PLAN_DURATIONS = {
  MONTHLY:     30,
  SEMI_ANNUAL: 182,
  ANNUAL:      365,
};

// Multi-currency plan pricing
const PLAN_PRICES = {
  MONTHLY:     { CZK: 990,  EUR: 39,  GBP: 35,  USD: 45 },
  SEMI_ANNUAL: { CZK: 5490, EUR: 219, GBP: 189, USD: 249 },
  ANNUAL:      { CZK: 9990, EUR: 399, GBP: 349, USD: 449 },
};

router.use(authMiddleware);

// ── GET /api/subscriptions/current
// Returns the active subscription for the caller's agency
router.get('/current', async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const now = new Date();

    // Auto-expire any subscriptions that passed their expiresAt
    await prisma.subscription.updateMany({
      where: { agencyId, status: 'ACTIVE', expiresAt: { lt: now } },
      data:  { status: 'EXPIRED' },
    });

    const active = await prisma.subscription.findFirst({
      where: { agencyId, status: { in: ['ACTIVE', 'TRIAL'] } },
      orderBy: { expiresAt: 'desc' },
    });

    res.json(active || null);
  } catch (err) {
    console.error('GET /subscriptions/current error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ── GET /api/subscriptions/history
// Full subscription history for the agency
router.get('/history', async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const list = await prisma.subscription.findMany({
      where:   { agencyId },
      orderBy: { startedAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── POST /api/subscriptions/start
// Start (or renew) a subscription for the agency
// Body: { plan: 'MONTHLY'|'SEMI_ANNUAL'|'ANNUAL', paymentRef?, amountPaid?, note? }
router.post('/start', async (req, res) => {
  try {
    const { plan, paymentRef, amountPaid, currency = 'CZK', note } = req.body;
    const agencyId = req.user.agencyId;

    if (!PLAN_DURATIONS[plan]) {
      return res.status(400).json({ error: `Invalid plan. Use: ${Object.keys(PLAN_DURATIONS).join(', ')}` });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + PLAN_DURATIONS[plan]);

    // Cancel any currently active subscription first
    await prisma.subscription.updateMany({
      where: { agencyId, status: { in: ['ACTIVE', 'TRIAL'] } },
      data:  { status: 'CANCELLED', cancelledAt: now },
    });

    const subscription = await prisma.subscription.create({
      data: {
        agencyId,
        plan,
        status:     'ACTIVE',
        startedAt:  now,
        expiresAt,
        amountPaid: amountPaid ?? PLAN_PRICES[plan][currency],
        currency,
        paymentRef: paymentRef ?? null,
        note:       note ?? null,
      },
    });

    // Update agency.plan field to reflect the active plan
    await prisma.agency.update({
      where: { id: agencyId },
      data:  { plan },
    });

    res.status(201).json(subscription);
  } catch (err) {
    console.error('POST /subscriptions/start error:', err);
    res.status(500).json({ error: 'Failed to start subscription' });
  }
});

// ── POST /api/subscriptions/cancel
// Cancel the active subscription
router.post('/cancel', async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { note } = req.body;
    const now = new Date();

    const result = await prisma.subscription.updateMany({
      where: { agencyId, status: { in: ['ACTIVE', 'TRIAL'] } },
      data:  { status: 'CANCELLED', cancelledAt: now, note: note ?? undefined },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'No active subscription to cancel' });
    }

    // Reset agency.plan to Standard
    await prisma.agency.update({
      where: { id: agencyId },
      data:  { plan: 'Standard' },
    });

    res.json({ success: true, cancelled: result.count });
  } catch (err) {
    console.error('POST /subscriptions/cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ── GET /api/subscriptions/plans
// Returns plan options + pricing (no auth needed for this)
router.get('/plans', (req, res) => {
  res.json(
    Object.entries(PLAN_DURATIONS).map(([key, days]) => ({
      id:            key,
      label:         { MONTHLY: 'Měsíční', SEMI_ANNUAL: 'Půlroční', ANNUAL: 'Roční' }[key],
      durationDays:  days,
      priceCZK:      PLAN_PRICES[key],
      savingVsMonth: key === 'MONTHLY' ? 0 : Math.round((1 - PLAN_PRICES[key] / (PLAN_PRICES.MONTHLY * days / 30)) * 100),
    }))
  );
});

// ── POST /api/subscriptions/trial   (App Owner only)
// Start a trial period for an agency
router.post('/trial', async (req, res) => {
  try {
    if (!req.user.isAppOwner && !req.user.isAdmin) {
      return res.status(403).json({ error: 'App Owner access required' });
    }
    const { agencyId, days = 14, note } = req.body;
    if (!agencyId) return res.status(400).json({ error: 'agencyId required' });

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + days);

    const trial = await prisma.subscription.create({
      data: {
        agencyId,
        plan:      'MONTHLY',
        status:    'TRIAL',
        startedAt:  now,
        expiresAt,
        amountPaid: 0,
        note:       note ?? `Trial – ${days} days`,
      },
    });

    res.status(201).json(trial);
  } catch (err) {
    console.error('POST /subscriptions/trial error:', err);
    res.status(500).json({ error: 'Failed to start trial' });
  }
});

// ── GET /api/subscriptions/admin/stats (App Owner only)
// Platform-wide metrics for the administration dashboard
router.get('/admin/stats', async (req, res) => {
  try {
    if (!req.user.isAppOwner && !req.user.isAdmin) {
      return res.status(403).json({ error: 'App Owner access required' });
    }

    const totalActive = await prisma.subscription.count({ where: { status: 'ACTIVE' } });
    const totalTrial = await prisma.subscription.count({ where: { status: 'TRIAL' } });
    
    const revenueByCurrency = await prisma.subscription.groupBy({
      by: ['currency'],
      _sum: { amountPaid: true },
      where: { status: 'ACTIVE' }
    });

    // Convert revenueByCurrency to a clean object map
    const revenueMap = {};
    revenueByCurrency.forEach(r => {
      revenueMap[r.currency] = r._sum.amountPaid || 0;
    });

    res.json({
      totalAgencies: totalActive + totalTrial,
      activeSubscriptions: totalActive,
      trialPeriods: totalTrial,
      revenueByCurrency: revenueMap,
      recentPayments: await prisma.subscription.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: { agency: true }
      })
    });
  } catch (err) {
    console.error('GET /subscriptions/admin/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

module.exports = router;
