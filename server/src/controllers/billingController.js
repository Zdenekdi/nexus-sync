const prisma = require('../services/db');
const logger = require('../services/logger');

/**
 * Billing & Subscription Automation Controller
 */
class BillingController {
  
  /**
   * Internal plan mapping to decouple frontend IDs from database tiers
   */
  PLAN_MAP = {
    'starter_monthly': { type: 'plan', targetValue: 'Starter', price: 290, currency: 'CZK' },
    'pro_monthly': { type: 'plan', targetValue: 'Professional', price: 990, currency: 'CZK' },
    'agency_monthly': { type: 'plan', targetValue: 'Agency', price: 2490, currency: 'CZK' },
    'ai_module': { type: 'addon', targetValue: 'ai_features', price: 490, currency: 'CZK' },
    'analytics_module': { type: 'addon', targetValue: 'analytics', price: 390, currency: 'CZK' },
    'api_access': { type: 'addon', targetValue: 'api_access', price: 290, currency: 'CZK' }
  };

  /**
   * 1. Create a Checkout Session
   */
  /**
   * 1. Create a Checkout Session or Bank Instructions
   */
  async createCheckoutSession(req, res) {
    try {
      const { agencyId } = req.user;
      const { planId, paymentMethod = 'card', successUrl, cancelUrl } = req.body;

      const planConfig = this.PLAN_MAP[planId];
      if (!planConfig) {
        return res.status(400).json({ message: `Invalid planId: ${planId}` });
      }

      const { type, targetValue, price, currency } = planConfig;

      // Create a pending subscription
      const subscription = await prisma.subscription.create({
        data: {
          agencyId,
          plan: targetValue,
          status: 'PENDING',
          amountPaid: price,
          currency,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          note: JSON.stringify({ type, targetValue, planId, paymentMethod })
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

      // MOCK for card (Stripe)
      const mockUrl = `${successUrl || 'http://localhost:3000/success'}?session_id=${subscription.id}`;
      
      res.json({
        paymentMethod: 'card',
        id: subscription.id,
        url: mockUrl,
        message: 'Checkout session created'
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
      let sessionId, status;

      if (req.body.id && req.body.object === 'event') {
        // PRODUCTION: Stripe Signature Logic here...
      } else {
        sessionId = req.body.sessionId;
        status = req.body.status;
      }

      if (!sessionId || status !== 'PAID') return res.status(200).json({ received: true });

      const result = await this._activateSubscription(sessionId);
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
  async _activateSubscription(sessionIdOrVS, isVS = false) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: isVS ? { paymentRef: String(sessionIdOrVS), status: 'PENDING' } : { id: sessionIdOrVS, status: 'PENDING' },
        include: { agency: true }
      });

      if (!subscription) return { success: false, message: 'Pending session not found' };

      const { type, targetValue } = JSON.parse(subscription.note || '{}');

      logger.info(`[Billing Activation] Processing ${type} for Agency ${subscription.agencyId} via ${isVS ? 'Fio' : 'Stripe'}`);

      if (type === 'plan') {
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
        data: { status: 'ACTIVE', startedAt: new Date() }
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
    const { sessionId } = req.body;
    req.body = { sessionId, status: 'PAID' };
    return this.handleWebhook(req, res);
  }
}

module.exports = new BillingController();
