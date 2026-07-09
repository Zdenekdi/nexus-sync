const prisma = require('./db');
const logger = require('./logger');
const { sendAlert } = require('./alertService');

const DEFAULT_PENDING_PAYMENT_MINUTES = 60;
const DEFAULT_RELAY_OFFLINE_MINUTES = 15;
const DEFAULT_ALERT_COOLDOWN_MINUTES = 60;

const lastAlertAt = new Map();

const positiveIntEnv = (name, fallback) => {
  const parsed = parseInt(process.env[name], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const minutesAgoCutoff = (now, minutes) => new Date(now.getTime() - minutes * 60 * 1000);

const ageMinutes = (now, value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
};

const safeJson = (value) => {
  if (!value || typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const isStripeOrCardPending = (subscription) => {
  const note = safeJson(subscription.note);
  const provider = String(note.provider || '').toLowerCase();
  const paymentMethod = String(note.paymentMethod || '').toLowerCase();
  const paymentRef = String(subscription.paymentRef || '');

  return provider === 'stripe' ||
    paymentMethod === 'card' ||
    paymentRef.startsWith('cs_') ||
    Boolean(note.stripeSessionId);
};

const formatSubscription = (subscription, now) => ({
  id: subscription.id,
  agencyId: subscription.agencyId,
  plan: subscription.plan,
  paymentRef: subscription.paymentRef || null,
  amountPaid: subscription.amountPaid ?? null,
  currency: subscription.currency || null,
  createdAt: subscription.createdAt,
  ageMinutes: ageMinutes(now, subscription.createdAt)
});

const formatBinding = (binding, now) => ({
  installationId: binding.installationId,
  agencyId: binding.agencyId || null,
  profileId: binding.profileId || null,
  profileName: binding.profile?.name || null,
  deviceName: binding.deviceName || binding.model || null,
  lastSeenAt: binding.lastSeenAt,
  ageMinutes: ageMinutes(now, binding.lastSeenAt)
});

class MonitoringService {
  async checkDatabase() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', issues: [] };
    } catch (error) {
      return {
        status: 'degraded',
        issues: [`Database connectivity check failed: ${error.message}`]
      };
    }
  }

  async checkStripe(now) {
    const thresholdMinutes = positiveIntEnv('PENDING_BILLING_ALERT_MINUTES', DEFAULT_PENDING_PAYMENT_MINUTES);
    const issues = [];
    const secretKeyConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
    const publishableKeyConfigured = Boolean(process.env.STRIPE_PUBLISHABLE_KEY);
    const webhookSecretConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    const requireStripe = process.env.REQUIRE_STRIPE_CONFIG === 'true';

    if (secretKeyConfigured && !webhookSecretConfigured) {
      issues.push('Stripe secret key is configured, but STRIPE_WEBHOOK_SECRET is missing. Paid checkouts may not activate.');
    }
    if (requireStripe && !secretKeyConfigured) {
      issues.push('REQUIRE_STRIPE_CONFIG=true, but STRIPE_SECRET_KEY is missing.');
    }

    let staleSubscriptions = [];
    try {
      const candidates = await prisma.subscription.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: minutesAgoCutoff(now, thresholdMinutes) }
        },
        orderBy: { createdAt: 'asc' },
        take: 25
      });
      staleSubscriptions = candidates.filter(isStripeOrCardPending).map(sub => formatSubscription(sub, now));
      if (staleSubscriptions.length > 0) {
        issues.push(`${staleSubscriptions.length} Stripe/card subscription(s) pending for more than ${thresholdMinutes} minutes.`);
      }
    } catch (error) {
      issues.push(`Stripe pending payment query failed: ${error.message}`);
    }

    return {
      status: issues.length > 0 ? 'degraded' : 'ok',
      thresholdMinutes,
      secretKeyConfigured,
      publishableKeyConfigured,
      webhookSecretConfigured,
      pendingCount: staleSubscriptions.length,
      pending: staleSubscriptions.slice(0, 10),
      issues
    };
  }

  async checkRelay(now) {
    const thresholdMinutes = positiveIntEnv('RELAY_OFFLINE_ALERT_MINUTES', DEFAULT_RELAY_OFFLINE_MINUTES);
    const issues = [];
    let offlineBindings = [];

    try {
      offlineBindings = await prisma.deviceBinding.findMany({
        where: {
          active: true,
          lastSeenAt: { lt: minutesAgoCutoff(now, thresholdMinutes) }
        },
        select: {
          installationId: true,
          agencyId: true,
          profileId: true,
          deviceName: true,
          model: true,
          lastSeenAt: true,
          profile: { select: { name: true } }
        },
        orderBy: { lastSeenAt: 'asc' },
        take: 25
      });
    } catch (error) {
      issues.push(`Relay offline query failed: ${error.message}`);
    }

    const formattedOffline = offlineBindings.map(binding => formatBinding(binding, now));
    if (formattedOffline.length > 0) {
      issues.push(`${formattedOffline.length} active Relay binding(s) have not checked in for more than ${thresholdMinutes} minutes.`);
    }

    return {
      status: issues.length > 0 ? 'degraded' : 'ok',
      thresholdMinutes,
      offlineCount: formattedOffline.length,
      offline: formattedOffline.slice(0, 10),
      issues
    };
  }

  async summarizeOperationalHealth(options = {}) {
    const now = options.now || new Date();
    const [database, stripe, relay] = await Promise.all([
      this.checkDatabase(),
      this.checkStripe(now),
      this.checkRelay(now)
    ]);

    const checks = { database, stripe, relay };
    const issues = Object.entries(checks).flatMap(([name, check]) =>
      (check.issues || []).map(message => ({ check: name, message }))
    );

    return {
      status: issues.length > 0 ? 'degraded' : 'ok',
      timestamp: now.toISOString(),
      checks,
      issues
    };
  }

  formatAlert(report) {
    if (!report || report.status === 'ok') return null;
    const lines = report.issues
      .slice(0, 12)
      .map(issue => `- ${issue.check}: ${issue.message}`);
    return [
      `Operational monitoring degraded (${process.env.NODE_ENV || 'unknown'})`,
      `Time: ${report.timestamp}`,
      '',
      ...lines
    ].join('\n');
  }

  shouldSendAlert(fingerprint, now) {
    const cooldownMinutes = positiveIntEnv('MONITOR_ALERT_COOLDOWN_MINUTES', DEFAULT_ALERT_COOLDOWN_MINUTES);
    const previous = lastAlertAt.get(fingerprint);
    if (!previous || now.getTime() - previous.getTime() >= cooldownMinutes * 60 * 1000) {
      lastAlertAt.set(fingerprint, now);
      return true;
    }
    return false;
  }

  async runOperationalChecks(options = {}) {
    const now = options.now || new Date();
    const report = await this.summarizeOperationalHealth({ now });
    const shouldAlert = options.sendAlerts !== false && report.status !== 'ok';

    if (shouldAlert) {
      const fingerprint = report.issues.map(issue => `${issue.check}:${issue.message}`).join('|');
      if (this.shouldSendAlert(fingerprint, now)) {
        const message = this.formatAlert(report);
        if (message) {
          try {
            await sendAlert(message, 'warning');
          } catch (error) {
            logger.warn('[Monitoring] Failed to send alert:', error.message);
          }
        }
      }
    }

    if (report.status !== 'ok') {
      logger.warn('[Monitoring] Operational health degraded', report.issues);
    }

    return report;
  }

  _resetForTests() {
    lastAlertAt.clear();
  }
}

module.exports = new MonitoringService();
