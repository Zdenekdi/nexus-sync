const prisma = require('../services/db');
const logger = require('../services/logger');
const Stripe = require('stripe');

/**
 * Billing & Subscription Automation Controller
 */
class BillingController {
  
  /**
   * Internal plan mapping to decouple frontend IDs from database tiers
   */
  PLAN_MAP = {
    starter_monthly: { type: 'plan', targetValue: 'Starter', name: 'Nexus Starter', prices: { CZK: 290, EUR: 12, GBP: 10, USD: 13 }, durationDays: 30, recurring: { interval: 'month', interval_count: 1 } },
    pro_monthly: { type: 'plan', targetValue: 'Professional', name: 'Nexus Professional', prices: { CZK: 990, EUR: 39, GBP: 35, USD: 45 }, durationDays: 30, recurring: { interval: 'month', interval_count: 1 } },
    agency_monthly: { type: 'plan', targetValue: 'Agency', name: 'Nexus Agency', prices: { CZK: 2490, EUR: 99, GBP: 85, USD: 109 }, durationDays: 30, recurring: { interval: 'month', interval_count: 1 } },
    MONTHLY: { type: 'plan', targetValue: 'MONTHLY', name: 'Nexus Monthly', prices: { CZK: 990, EUR: 39, GBP: 35, USD: 45 }, durationDays: 30, recurring: { interval: 'month', interval_count: 1 } },
    SEMI_ANNUAL: { type: 'plan', targetValue: 'SEMI_ANNUAL', name: 'Nexus Semi-Annual', prices: { CZK: 5490, EUR: 219, GBP: 189, USD: 249 }, durationDays: 182, recurring: { interval: 'month', interval_count: 6 } },
    ANNUAL: { type: 'plan', targetValue: 'ANNUAL', name: 'Nexus Annual', prices: { CZK: 9990, EUR: 399, GBP: 349, USD: 449 }, durationDays: 365, recurring: { interval: 'year', interval_count: 1 } },
    ai_module: { type: 'addon', targetValue: 'ai_features', name: 'AI Optimizer Pack', prices: { CZK: 490, EUR: 20, GBP: 18, USD: 22 }, durationDays: 30 },
    ai_opt: { type: 'addon', targetValue: 'ai_features', name: 'AI Optimizer Pack', prices: { CZK: 1200, EUR: 48, GBP: 42, USD: 52 }, durationDays: 30 },
    analytics_module: { type: 'addon', targetValue: 'analytics', name: 'Analytics Module', prices: { CZK: 390, EUR: 16, GBP: 14, USD: 18 }, durationDays: 30 },
    api_access: { type: 'addon', targetValue: 'api_access', name: 'Developer API Access', prices: { CZK: 290, EUR: 12, GBP: 10, USD: 13 }, durationDays: 30 },
    senior_op: { type: 'addon', targetValue: 'senior_operator', name: 'Senior Operator Role', prices: { CZK: 500, EUR: 20, GBP: 18, USD: 22 }, durationDays: 30 },
    vip_supp: { type: 'addon', targetValue: 'vip_support', name: 'Priority VIP Support', prices: { CZK: 2000, EUR: 80, GBP: 70, USD: 88 }, durationDays: 30 },
    extra_profiles: { type: 'addon', targetValue: 'extra_profiles', name: 'Extra Profiles Pack', prices: { CZK: 250, EUR: 10, GBP: 9, USD: 11 }, durationDays: 30 }
  };

  DEFAULT_DYNAMIC_PLANS = [
    { id: 'basic', name: 'Basic', prices: { cz: '2900', eu: '120', us: '130', uk: '110' }, profilesLimit: 5 },
    { id: 'pro', name: 'Pro', prices: { cz: '5900', eu: '240', us: '260', uk: '220' }, profilesLimit: 10 },
    { id: 'agency', name: 'Agency', prices: { cz: '9900', eu: '400', us: '440', uk: '360' }, profilesLimit: 20 }
  ];

  MARKET_CURRENCY = {
    cz: 'CZK',
    eu: 'EUR',
    uk: 'GBP',
    us: 'USD'
  };

  get stripe() {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    if (!this._stripe) {
      this._stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return this._stripe;
  }

  normalizeCurrency(currency, market) {
    const fromMarket = this.MARKET_CURRENCY[String(market || '').toLowerCase()];
    const normalized = String(currency || fromMarket || 'CZK').toUpperCase();
    return ['CZK', 'EUR', 'GBP', 'USD'].includes(normalized) ? normalized : 'CZK';
  }

  priceFor(item, currency) {
    const value = item.prices?.[currency] ?? item.price;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  toMinorUnits(amount) {
    return Math.round(Number(amount) * 100);
  }

  checkoutUrl(baseUrl, status) {
    const fallback = status === 'success'
      ? 'https://nexus-sync-8d50b.web.app/plans'
      : 'https://nexus-sync-8d50b.web.app/plans';
    const url = baseUrl || fallback;
    const separator = url.includes('?') ? '&' : '?';
    return status === 'success'
      ? `${url}${separator}checkout=success&session_id={CHECKOUT_SESSION_ID}`
      : `${url}${separator}checkout=cancelled`;
  }

  targetValueForPlan(plan) {
    const id = String(plan.id || '').toLowerCase();
    if (id === 'basic') return 'Starter';
    if (id === 'pro') return 'Professional';
    if (id === 'agency') return 'Agency';
    return plan.name || plan.id;
  }

  async getDynamicPlan(planId, currency, market) {
    let plans = this.DEFAULT_DYNAMIC_PLANS;
    try {
      const setting = await prisma.globalSetting?.findUnique?.({ where: { key: 'SUBSCRIPTION_PLANS' } });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) plans = parsed;
      }
    } catch (error) {
      logger.warn('[Billing] Could not load dynamic subscription plans:', error.message);
    }

    const plan = plans.find(p => String(p.id).toLowerCase() === String(planId).toLowerCase());
    if (!plan) return null;

    const marketKey = Object.entries(this.MARKET_CURRENCY).find(([, value]) => value === currency)?.[0] || String(market || 'cz').toLowerCase();
    const amount = Number(plan.prices?.[marketKey]);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    return {
      type: 'plan',
      targetValue: this.targetValueForPlan(plan),
      name: `Nexus ${plan.name}`,
      price: amount,
      currency,
      durationDays: 30,
      recurring: { interval: 'month', interval_count: 1 },
      metadata: { profilesLimit: String(plan.profilesLimit ?? '') }
    };
  }

  async resolveBillingItem(planId, currency, market) {
    const staticConfig = this.PLAN_MAP[planId];
    if (staticConfig) {
      return {
        ...staticConfig,
        price: this.priceFor(staticConfig, currency),
        currency
      };
    }
    return this.getDynamicPlan(planId, currency, market);
  }

  /**
   * 1. Create a Checkout Session
   */
  /**
   * 1. Create a Checkout Session or Bank Instructions
   */
  async createCheckoutSession(req, res) {
    try {
      const { agencyId } = req.user;
      const { planId, paymentMethod = 'card', successUrl, cancelUrl, currency: requestedCurrency, market } = req.body;
      const currency = this.normalizeCurrency(requestedCurrency, market);

      const planConfig = await this.resolveBillingItem(planId, currency, market);
      if (!planConfig) {
        return res.status(400).json({ message: `Invalid planId: ${planId}` });
      }

      const { type, targetValue, price, durationDays = 30 } = planConfig;
      if (!price) return res.status(400).json({ message: `Price is not configured for ${planId} in ${currency}` });

      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      const note = {
        type,
        targetValue,
        planId,
        paymentMethod,
        provider: paymentMethod === 'card' ? 'stripe' : 'bank_transfer',
        currency,
        market: market || null
      };

      const mockBillingAllowed = process.env.NODE_ENV === 'test' || process.env.ALLOW_MOCK_BILLING === 'true';
      if (paymentMethod === 'card' && !this.stripe && !mockBillingAllowed) {
        return res.status(503).json({
          code: 'stripe_not_configured',
          message: 'Stripe is not configured. Set STRIPE_SECRET_KEY on the backend.'
        });
      }

      // Create a pending subscription
      const subscription = await prisma.subscription.create({
        data: {
          agencyId,
          plan: targetValue,
          status: 'PENDING',
          amountPaid: price,
          currency,
          expiresAt,
          note: JSON.stringify(note)
        }
      });

      if (paymentMethod === 'transfer') {
        // GENERATE VARIABLE SYMBOL (Numeric, max 10 digits)
        // We use a simple hash of the subscription ID + part of timestamp
        const vs = Math.abs(subscription.id.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0) % 1000000000);
        
        // Update subscription with the VS
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { paymentRef: String(vs) }
        });

        return res.json({
          paymentMethod: 'transfer',
          provider: 'bank_transfer',
          id: subscription.id,
          instructions: {
            accountNumber: process.env.BANK_ACCOUNT || '123456789/2010',
            bankName: 'Fio banka, a.s.',
            amount: price,
            currency,
            variableSymbol: vs,
            message: `Nexus Hub - ${planId}`
          },
          message: 'Bank transfer instructions generated'
        });
      }

      if (!this.stripe) {
        if (mockBillingAllowed) {
          const mockUrl = `${successUrl || 'http://localhost:3000/success'}?session_id=${subscription.id}`;
          return res.json({
            paymentMethod: 'card',
            provider: 'mock',
            id: subscription.id,
            url: mockUrl,
            message: 'Mock checkout session created'
          });
        }
      }

      const mode = type === 'plan' ? 'subscription' : 'payment';
      const metadata = {
        localSubscriptionId: subscription.id,
        agencyId,
        planId,
        type,
        targetValue
      };

      const lineItem = {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: this.toMinorUnits(price),
          product_data: {
            name: planConfig.name || `Nexus ${targetValue}`,
            metadata: {
              planId,
              type,
              targetValue,
              ...(planConfig.metadata || {})
            }
          }
        }
      };

      if (mode === 'subscription') {
        lineItem.price_data.recurring = planConfig.recurring || { interval: 'month', interval_count: 1 };
      }

      const sessionPayload = {
        mode,
        line_items: [lineItem],
        success_url: this.checkoutUrl(successUrl, 'success'),
        cancel_url: this.checkoutUrl(cancelUrl || successUrl, 'cancel'),
        client_reference_id: subscription.id,
        metadata,
        customer_email: req.user.email || undefined,
        allow_promotion_codes: true
      };

      if (mode === 'subscription') {
        sessionPayload.subscription_data = { metadata };
      } else {
        sessionPayload.payment_intent_data = { metadata };
      }

      const session = await this.stripe.checkout.sessions.create(sessionPayload);
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          paymentRef: session.id,
          note: JSON.stringify({ ...note, stripeSessionId: session.id, stripeMode: mode })
        }
      });
      
      res.json({
        paymentMethod: 'card',
        provider: 'stripe',
        id: session.id,
        localSubscriptionId: subscription.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
        url: session.url,
        message: 'Stripe Checkout session created'
      });
    } catch (error) {
      logger.error('[Billing] Create Session Error:', error);
      res.status(500).json({ message: 'Failed to initialize payment' });
    }
  }

  /**
   * 2. Handle Payment Webhook (Stripe/Simulation)
   */
  async handleWebhook(req, res) {
    try {
      let sessionId, status, stripeSubscriptionId, stripePaymentIntentId;
      const allowUnsignedWebhook = process.env.NODE_ENV === 'test' || process.env.ALLOW_UNSIGNED_BILLING_WEBHOOK === 'true';

      if (Buffer.isBuffer(req.body)) {
        const signature = req.headers['stripe-signature'];
        if (signature && process.env.STRIPE_WEBHOOK_SECRET && this.stripe) {
          const event = this.stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
          if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
            return res.json({ received: true, ignored: event.type });
          }

          const session = event.data.object;
          sessionId = session.metadata?.localSubscriptionId || session.client_reference_id;
          status = session.payment_status === 'paid' || session.status === 'complete' ? 'PAID' : session.payment_status;
          stripeSubscriptionId = session.subscription || null;
          stripePaymentIntentId = session.payment_intent || null;
        } else if (process.env.NODE_ENV === 'test') {
          const parsed = JSON.parse(req.body.toString('utf8') || '{}');
          sessionId = parsed.sessionId;
          status = parsed.status;
        } else {
          return res.status(400).json({ message: 'Missing Stripe webhook signature configuration' });
        }
      } else if (allowUnsignedWebhook && req.body?.id && req.body?.object === 'event') {
        const session = req.body.data?.object || {};
        sessionId = session.metadata?.localSubscriptionId || session.client_reference_id;
        status = session.payment_status === 'paid' || session.status === 'complete' ? 'PAID' : session.payment_status;
        stripeSubscriptionId = session.subscription || null;
        stripePaymentIntentId = session.payment_intent || null;
      } else if (allowUnsignedWebhook) {
        sessionId = req.body.sessionId;
        status = req.body.status;
      } else {
        return res.status(400).json({ message: 'Unsigned billing webhook rejected' });
      }

      if (!sessionId || status !== 'PAID') return res.status(200).json({ received: true });

      const result = await this._activateSubscription(sessionId, false, {
        stripeSubscriptionId,
        stripePaymentIntentId
      });
      if (!result.success) return res.status(404).json({ message: result.message });

      res.json({ ok: true, activated: result.targetValue });
    } catch (error) {
      logger.error('[Billing Webhook] Error:', error);
      res.status(500).json({ message: 'Internal automation error' });
    }
  }

  /**
   * INTERNAL: Unified activation logic
   * Can be called by Webhooks (Stripe) or Workers (Fio)
   */
  async _activateSubscription(sessionIdOrVS, isVS = false, paymentMeta = {}) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: isVS ? { paymentRef: String(sessionIdOrVS), status: 'PENDING' } : { id: sessionIdOrVS, status: 'PENDING' },
        include: { agency: true }
      });

      if (!subscription) return { success: false, message: 'Pending session not found' };

      const { type, targetValue } = JSON.parse(subscription.note || '{}');

      logger.info(`[Billing Activation] Processing ${type} for Agency ${subscription.agencyId} via ${isVS ? 'Fio' : 'Stripe'}`);

      if (type === 'plan') {
        await prisma.subscription.updateMany({
          where: { agencyId: subscription.agencyId, status: { in: ['ACTIVE', 'TRIAL'] } },
          data: { status: 'CANCELLED', cancelledAt: new Date() }
        });

        await prisma.agency.update({
          where: { id: subscription.agencyId },
          data: { plan: targetValue, tier: targetValue }
        });
      } else if (type === 'addon') {
        const currentFeatures = JSON.parse(subscription.agency.extraFeatures || '{}');
        currentFeatures[targetValue] = true;
        await prisma.agency.update({
          where: { id: subscription.agencyId },
          data: { extraFeatures: JSON.stringify(currentFeatures) }
        });
      }

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          startedAt: new Date(),
          paymentRef: paymentMeta.stripeSubscriptionId || paymentMeta.stripePaymentIntentId || subscription.paymentRef
        }
      });

      return { success: true, targetValue };
    } catch (error) {
      logger.error('[_activateSubscription] Error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Helper for testing/manual simulation
   */
  async simulateSuccess(req, res) {
    const allowed = process.env.NODE_ENV === 'test' || process.env.ALLOW_BILLING_SIMULATION === 'true';
    if (!allowed) {
      return res.status(403).json({ message: 'Billing simulation is disabled' });
    }
    const { sessionId } = req.body;
    req.body = { sessionId, status: 'PAID' };
    return this.handleWebhook(req, res);
  }
}

module.exports = new BillingController();
