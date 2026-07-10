const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { startSubscription, cancelSubscription, startTrial } = require('../middleware/schemas');
const { isAppOwnerRole, isManagerRole } = require('../utils/authz');

// Plan durations in days
const PLAN_DURATIONS = {
  Starter: 30,
  Professional: 30,
  Agency: 30,
};

// Multi-currency plan pricing
const PLAN_PRICES = {
  Starter:      { CZK: 290,  EUR: 12, GBP: 10, USD: 13 },
  Professional: { CZK: 990,  EUR: 39, GBP: 35, USD: 45 },
  Agency:       { CZK: 2490, EUR: 99, GBP: 85, USD: 109 },
};

const CURRENT_SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PENDING'];

const daysUntil = (date, now = new Date()) => {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.ceil((parsed.getTime() - now.getTime()) / 86400000);
};

const paidUntilFor = (subscription) => subscription?.currentPeriodEnd || subscription?.expiresAt || null;

const formatAdminTransaction = (subscription) => {
  const paidUntil = paidUntilFor(subscription);
  return {
    id: subscription.id,
    agencyId: subscription.agencyId,
    agencyName: subscription.agency?.name || 'Unknown agency',
    plan: subscription.plan,
    status: subscription.status,
    amount: subscription.amountPaid,
    amountPaid: subscription.amountPaid,
    currency: subscription.currency,
    provider: subscription.provider || null,
    providerStatus: subscription.providerStatus || null,
    paymentRef: subscription.paymentRef || null,
    startedAt: subscription.startedAt,
    expiresAt: subscription.expiresAt,
    paidUntil,
    createdAt: subscription.createdAt
  };
};

const formatAgencySubscriptionRow = (agency, subscription, now = new Date()) => {
  const paidUntil = paidUntilFor(subscription);
  const remaining = daysUntil(paidUntil, now);
  const plan = subscription?.plan || agency.plan || agency.tier || 'Standard';

  return {
    agencyId: agency.id,
    agencyName: agency.name,
    email: agency.email || null,
    region: agency.region || null,
    agencyPlan: agency.plan || null,
    agencyTier: agency.tier || null,
    subscriptionId: subscription?.id || null,
    plan,
    status: subscription?.status || 'NO_ACTIVE_SUBSCRIPTION',
    amountPaid: subscription?.amountPaid ?? null,
    currency: subscription?.currency || null,
    provider: subscription?.provider || null,
    providerStatus: subscription?.providerStatus || null,
    paymentRef: subscription?.paymentRef || null,
    startedAt: subscription?.startedAt || null,
    expiresAt: subscription?.expiresAt || null,
    paidUntil,
    currentPeriodStart: subscription?.currentPeriodStart || null,
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
    daysRemaining: remaining,
    isExpired: remaining !== null ? remaining < 0 : false
  };
};

// ── GET /api/subscriptions/plans
// Returns plan options + pricing (no auth needed for this)
router.get('/plans', async (req, res) => {
  const defaultPlans = [
    { id: 'starter_monthly', name: 'Starter', description: 'Základní správa profilů, SOS alerty a manuální SMS routing.', prices: { cz: '290', eu: '12', us: '13', uk: '10' }, profilesLimit: 5, features: ['Správa profilů', 'SOS alerty', 'Manuální SMS routing'] },
    { id: 'pro_monthly', name: 'Professional', description: 'Nejlepší volba pro rostoucí týmy včetně analytiky a AI funkcí.', prices: { cz: '990', eu: '39', us: '45', uk: '35' }, profilesLimit: 10, features: ['Vše ve Starter', 'Analytics modul', 'AI chatové návrhy'] },
    { id: 'agency_monthly', name: 'Agency', description: 'Kompletní řešení pro agentury s API přístupem a prioritní podporou.', prices: { cz: '2490', eu: '99', us: '109', uk: '85' }, profilesLimit: 20, features: ['Vše v Professional', 'Developer API přístup', 'Prioritní podpora'] }
  ];

  try {
    const setting = await prisma.globalSetting.findUnique({ where: { key: 'SUBSCRIPTION_PLANS' } });
    if (setting && setting.value) {
      return res.json(JSON.parse(setting.value));
    }
    return res.json(defaultPlans);
  } catch (err) {
    console.warn('[API] GET /subscriptions/plans database query failed, using hardcoded fallbacks:', err.message);
    // Explicitly return success with default data even on DB error
    return res.json(defaultPlans);
  }
});

router.use(authMiddleware);

const requireSubscriptionManager = (req, res, next) => {
  if (!isManagerRole(req.user?.role)) {
    return res.status(403).json({ message: 'Manager role required' });
  }
  next();
};

const requireAgencySubscriptionScope = (req, res, next) => {
  if (req.user?.agencyId) return next();
  return res.status(403).json({
    code: 'agency_required',
    message: 'Subscription action requires an agency-scoped user.'
  });
};

const requireManualSubscriptionStart = (req, res, next) => {
  if (isAppOwnerRole(req.user?.role)) return next();

  const allowManagerOverride = process.env.ALLOW_MANUAL_SUBSCRIPTION_START === 'true';
  const isNonProduction = process.env.NODE_ENV !== 'production';
  if (allowManagerOverride && isNonProduction && isManagerRole(req.user?.role)) {
    return next();
  }

  return res.status(403).json({ message: 'Manual subscription activation requires App Owner' });
};

// ── GET /api/subscriptions/current
// Returns the active subscription for the caller's agency
router.get('/current', requireAgencySubscriptionScope, async (req, res) => {
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
    res.status(500).json({ message: 'Failed to fetch subscription' });
  }
});

// ── GET /api/subscriptions/history
// Full subscription history for the agency
router.get('/history', requireAgencySubscriptionScope, async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const list = await prisma.subscription.findMany({
      where:   { agencyId },
      orderBy: { startedAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// ── POST /api/subscriptions/start
// Start (or renew) a subscription for the agency
// Body: { plan: 'Starter'|'Professional'|'Agency', paymentRef?, amountPaid?, note? }
router.post('/start', requireAgencySubscriptionScope, requireManualSubscriptionStart, validate(startSubscription), async (req, res) => {
  try {
    const { plan, paymentRef, amountPaid, currency = 'CZK', note } = req.body;
    const agencyId = req.user.agencyId;

    if (!PLAN_DURATIONS[plan]) {
      return res.status(400).json({ message: `Invalid plan. Use: ${Object.keys(PLAN_DURATIONS).join(', ')}` });
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
      data:  { plan, tier: plan },
    });

    res.status(201).json(subscription);
  } catch (err) {
    console.error('POST /subscriptions/start error:', err);
    res.status(500).json({ message: 'Failed to start subscription' });
  }
});

// ── POST /api/subscriptions/cancel
// Cancel the active subscription
router.post('/cancel', requireAgencySubscriptionScope, requireSubscriptionManager, validate(cancelSubscription), async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { note } = req.body;
    const now = new Date();

    const active = await prisma.subscription.findFirst({
      where: { agencyId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
      orderBy: { updatedAt: 'desc' },
    });

    if (active?.provider === 'stripe' || active?.stripeSubscriptionId) {
      return res.status(409).json({
        code: 'stripe_portal_required',
        message: 'Stripe subscriptions must be managed through the Billing Portal.'
      });
    }

    const result = await prisma.subscription.updateMany({
      where: { agencyId, status: { in: ['ACTIVE', 'TRIAL'] } },
      data:  { status: 'CANCELLED', cancelledAt: now, note: note ?? undefined },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'No active subscription to cancel' });
    }

    // Reset agency.plan to Standard
    await prisma.agency.update({
      where: { id: agencyId },
      data:  { plan: 'Standard', tier: 'Standard' },
    });

    res.json({ success: true, cancelled: result.count });
  } catch (err) {
    console.error('POST /subscriptions/cancel error:', err);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});


// ── POST /api/subscriptions/config (App Owner only)
// Update dynamic plan options
router.post('/config', async (req, res) => {
  try {
    if (!req.user || !req.user.role?.isAppOwner) {
      return res.status(403).json({ message: 'Only App Owner can configure plans' });
    }
    const { plans } = req.body;
    if (!plans || !Array.isArray(plans)) {
      return res.status(400).json({ message: 'Invalid plans format' });
    }

    await prisma.globalSetting.upsert({
      where: { key: 'SUBSCRIPTION_PLANS' },
      update: { value: JSON.stringify(plans) },
      create: { key: 'SUBSCRIPTION_PLANS', value: JSON.stringify(plans) },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('POST /subscriptions/config error:', err);
    res.status(500).json({ message: 'Failed to update plan configuration' });
  }
});

// ── POST /api/subscriptions/trial   (App Owner only)
// Start a trial period for an agency
router.post('/trial', validate(startTrial), async (req, res) => {
  try {
    if (!req.user.role?.isAppOwner) {
      return res.status(403).json({ message: 'App Owner access required' });
    }
    const { agencyId, days = 14, note } = req.body;
    if (!agencyId) return res.status(400).json({ message: 'agencyId required' });

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + days);

    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true, name: true }
    });
    if (!agency) return res.status(404).json({ message: 'Agency not found' });

    const paidSubscription = await prisma.subscription.findFirst({
      where: { agencyId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
      orderBy: { expiresAt: 'desc' }
    });
    if (paidSubscription) {
      return res.status(409).json({
        code: 'active_subscription_exists',
        message: 'Agency already has an active or past-due paid subscription.'
      });
    }

    await prisma.subscription.updateMany({
      where: { agencyId, status: { in: ['TRIAL', 'PENDING'] } },
      data: { status: 'CANCELLED', cancelledAt: now }
    });

    const trial = await prisma.subscription.create({
      data: {
        agencyId,
        plan:      'Starter',
        status:    'TRIAL',
        startedAt:  now,
        expiresAt,
        amountPaid: 0,
        provider:   'manual',
        providerStatus: 'trial_granted',
        note:       note ?? `Trial - ${days} days`,
      },
    });

    await prisma.agency.update({
      where: { id: agencyId },
      data: { plan: 'Starter', tier: 'Starter' }
    });

    res.status(201).json(trial);
  } catch (err) {
    console.error('POST /subscriptions/trial error:', err);
    res.status(500).json({ message: 'Failed to start trial' });
  }
});

// ── GET /api/subscriptions/admin/stats (App Owner only)
// Platform-wide metrics for the administration dashboard
router.get('/admin/stats', async (req, res) => {
  try {
    if (!req.user.role?.isAppOwner) {
      return res.status(403).json({ message: 'App Owner access required' });
    }

    const now = new Date();

    const [
      totalAgencies,
      totalActive,
      totalTrial,
      revenueByCurrency,
      planDistributionRows,
      recentPayments,
      agencies,
      currentSubscriptions
    ] = await Promise.all([
      prisma.agency.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.groupBy({
        by: ['currency'],
        _sum: { amountPaid: true },
        where: { status: 'ACTIVE' }
      }),
      prisma.subscription.groupBy({
        by: ['plan'],
        _count: { _all: true },
        where: { status: { in: ['ACTIVE', 'TRIAL'] } }
      }),
      prisma.subscription.findMany({
        take: 10,
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        include: { agency: true }
      }),
      prisma.agency.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          region: true,
          plan: true,
          tier: true
        }
      }),
      prisma.subscription.findMany({
        where: { status: { in: CURRENT_SUBSCRIPTION_STATUSES } },
        orderBy: [{ expiresAt: 'desc' }, { updatedAt: 'desc' }],
        include: { agency: true }
      })
    ]);

    // Convert revenueByCurrency to a clean object map
    const revenueMap = {};
    revenueByCurrency.forEach(r => {
      revenueMap[r.currency] = r._sum.amountPaid || 0;
    });

    const planDistribution = {};
    planDistributionRows.forEach(row => {
      planDistribution[row.plan] = row._count?._all || 0;
    });

    const currentByAgency = new Map();
    for (const subscription of currentSubscriptions) {
      const existing = currentByAgency.get(subscription.agencyId);
      if (!existing || (paidUntilFor(subscription)?.getTime?.() || 0) > (paidUntilFor(existing)?.getTime?.() || 0)) {
        currentByAgency.set(subscription.agencyId, subscription);
      }
    }

    const recentTransactions = recentPayments.map(formatAdminTransaction);
    const agencySubscriptions = agencies.map((agency) =>
      formatAgencySubscriptionRow(agency, currentByAgency.get(agency.id), now)
    );

    res.json({
      totalAgencies,
      activeSubscriptions: totalActive,
      trialPeriods: totalTrial,
      revenueByCurrency: revenueMap,
      planDistribution,
      recentPayments,
      recentTransactions,
      agencySubscriptions
    });
  } catch (err) {
    console.error('GET /subscriptions/admin/stats error:', err);
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
});

module.exports = router;
