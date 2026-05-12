const prisma = require('../services/db');

/**
 * Plan & Feature Middleware
 * Checks if the current agency's plan/tier is allowed OR if they have the specific feature enabled in extraFeatures.
 * 
 * Usage: router.post('/ai-task', requirePlan(['Professional', 'Agency'], 'ai_enabled'), controller);
 */
const requirePlan = (allowedPlans, featureKey = null) => {
  return async (req, res, next) => {
    try {
      const { agencyId, role } = req.user;

      // App Owners bypass everything
      if (role?.isAppOwner || (typeof role === 'string' && role.toUpperCase() === 'APP OWNER')) {
        return next();
      }

      if (!agencyId) {
        return res.status(403).json({ message: 'Agency context required' });
      }

      // Fetch the latest agency data including extraFeatures
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        select: { plan: true, tier: true, extraFeatures: true }
      });

      if (!agency) {
        return res.status(404).json({ message: 'Agency not found' });
      }

      const currentPlan = agency.plan || agency.tier || 'Standard';
      
      // 1. Check if the Plan matches
      if (allowedPlans.includes(currentPlan)) {
        return next();
      }

      // 2. Check if the specific Feature is enabled as an add-on
      if (featureKey && agency.extraFeatures) {
        try {
          const features = JSON.parse(agency.extraFeatures);
          if (features[featureKey] === true || features[featureKey] === 'true') {
            return next();
          }
        } catch (e) {
          console.warn('[Plan Middleware] Failed to parse extraFeatures JSON for agency:', agencyId);
        }
      }

      // 3. Denied
      return res.status(403).json({ 
        message: 'Premium Feature',
        requiredPlans: allowedPlans,
        featureKey: featureKey,
        currentPlan: currentPlan,
        info: 'Tato funkce vyžaduje vyšší úroveň předplatného nebo zakoupený add-on.'
      });
    } catch (error) {
      console.error('[Plan Middleware] Error:', error);
      res.status(500).json({ message: 'Internal server error during plan verification' });
    }
  };
};

module.exports = { requirePlan };
