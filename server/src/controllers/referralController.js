const prisma = require('../services/db');
const crypto = require('crypto');
const { isManagerRole, isAppOwnerRole } = require('../utils/authz');

// Generate a unique referral code for the agency
function generateReferralCode() {
  return 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET /api/referrals/stats — referral dashboard stats
exports.getStats = async (req, res) => {
  try {
    const { agencyId } = req.user;
    if (!agencyId) {
      return res.status(403).json({
        code: 'agency_required',
        message: 'Referral stats require an agency-scoped user.'
      });
    }

    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { referralCode: true }
    });

    const referrals = await prisma.referral.findMany({
      where: { referrerId: agencyId },
      include: {
        referred: { select: { id: true, name: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalSignups = referrals.length;
    const confirmed = referrals.filter(r => r.status === 'confirmed');
    const pending = referrals.filter(r => r.status === 'pending');
    const totalEarned = confirmed.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
    const pendingEarned = pending.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

    res.json({
      referralCode: agency?.referralCode || null,
      totalSignups,
      confirmed: confirmed.length,
      pending: pending.length,
      totalEarned,
      pendingEarned,
      referrals: referrals.map(r => ({
        id: r.id,
        agencyName: r.referred?.name || 'Unknown',
        status: r.status,
        rewardAmount: r.rewardAmount,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ message: 'Failed to fetch referral stats' });
  }
};

// POST /api/referrals/generate-code — generate or return existing referral code
exports.generateCode = async (req, res) => {
  try {
    const { agencyId } = req.user;
    if (!agencyId) {
      return res.status(400).json({ message: 'Agency ID missing from token' });
    }

    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { referralCode: true }
    });

    if (agency?.referralCode) {
      return res.json({ referralCode: agency.referralCode });
    }

    // Generate unique code
    let code;
    let attempts = 0;
    do {
      code = generateReferralCode();
      const existing = await prisma.agency.findUnique({ where: { referralCode: code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const updated = await prisma.agency.update({
      where: { id: agencyId },
      data: { referralCode: code }
    });

    res.json({ referralCode: updated.referralCode });
  } catch (error) {
    console.error('[Referral] generateCode error:', error.message);
    res.status(500).json({ 
      message: 'Failed to generate referral code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// POST /api/referrals/apply — apply a referral code during agency registration
// Called internally from authController or externally
exports.applyReferral = async (referralCode, newAgencyId) => {
  if (!referralCode || !newAgencyId) return null;

  try {
    const referrer = await prisma.agency.findUnique({
      where: { referralCode },
      select: { id: true }
    });

    if (!referrer || referrer.id === newAgencyId) return null;

    // Check if already referred
    const existing = await prisma.referral.findUnique({
      where: { referredId: newAgencyId }
    });
    if (existing) return null;

    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: newAgencyId,
        status: 'pending',
        rewardAmount: 0
      }
    });

    return referral;
  } catch (error) {
    console.error('Error applying referral:', error);
    return null;
  }
};

// POST /api/referrals/:id/confirm — confirm a referral (admin/app owner only)
exports.confirmReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { rewardAmount } = req.body;

    if (!isManagerRole(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can confirm referrals' });
    }

    const referral = await prisma.referral.findUnique({ where: { id } });
    if (!referral) return res.status(404).json({ message: 'Referral not found' });

    // Only the referrer's agency managers can confirm
    if (referral.referrerId !== req.user.agencyId && !isAppOwnerRole(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updated = await prisma.referral.update({
      where: { id },
      data: {
        status: 'confirmed',
        ...(rewardAmount !== undefined && { rewardAmount: parseFloat(rewardAmount) })
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error confirming referral:', error);
    res.status(500).json({ message: 'Failed to confirm referral' });
  }
};
// GET /api/referrals/admin/all — list all referrals (App Owner only)
exports.getAllReferrals = async (req, res) => {
  try {
    if (!isAppOwnerRole(req.user.role)) {
      return res.status(403).json({ message: 'Only App Owners can access the master referral list' });
    }

    const referrals = await prisma.referral.findMany({
      include: {
        referrer: { select: { id: true, name: true } },
        referred: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(referrals);
  } catch (error) {
    console.error('[Referral] getAllReferrals error:', error);
    res.status(500).json({ message: 'Failed to fetch all referrals' });
  }
};
