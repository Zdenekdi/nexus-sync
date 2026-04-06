const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../services/db');

const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_DAYS = 7;

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      agencyId: user.agencyId,
      role: {
        name: user.role.name,
        isManager: user.role.isManager,
        isAppOwner: user.role.isAppOwner
      }
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt }
  });

  return token;
}

function buildUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
    isManager: user.role.isManager,
    isAppOwner: user.role.isAppOwner,
    agencyId: user.agencyId,
    agencyName: user.agency?.name || 'System',
    profileId: user.assignedProfiles?.[0]?.id || null
  };
}

exports.login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.toLowerCase();
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, agency: true, assignedProfiles: { take: 1, select: { id: true } } }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    res.json({
      token: accessToken,
      refreshToken,
      expiresIn: 3600,
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { role: true, agency: true, assignedProfiles: { take: 1, select: { id: true } } } } }
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Rotate: revoke old, issue new pair
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    const accessToken = generateAccessToken(stored.user);
    const newRefreshToken = await generateRefreshToken(stored.userId);

    res.json({
      token: accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
      user: buildUserResponse(stored.user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.registerAgency = async (req, res) => {
  try {
    const { agencyName, fullName, email: rawEmail2, password } = req.body;
    const email = rawEmail2?.toLowerCase();
    
    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    
    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Create Agency, Admin Role, and User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: agencyName,
          region: 'Global',
          plan: 'Standard',
          inviteCode: `NEXUS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`
        }
      });

      const globalTemplate = await tx.role.findFirst({
        where: { name: 'Agency Admin', agencyId: null }
      });

      const defaultPerms = JSON.stringify({
        permissions: true, hierarchy: true, analytics: true, messaging: true,
        calendar: true, profiles: true, web_profiles: true, device_setup: true,
        audit_logs: true, qa_hub: true, settings: true, inventory: false
      });

      const role = await tx.role.create({
        data: {
          name: 'Agency Admin',
          description: 'Full access to agency resources',
          permissions: globalTemplate ? globalTemplate.permissions : defaultPerms,
          isAppOwner: false,
          agencyId: agency.id
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: fullName,
          roleId: role.id,
          agencyId: agency.id
        }
      });

      return { agency, user };
    });

    res.status(201).json({ 
      message: 'Agency registered successfully',
      agencyId: result.agency.id,
      inviteCode: result.agency.inviteCode
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { fullName, email: rawEmail3, password, inviteCode, roleName } = req.body;
    const email = rawEmail3?.toLowerCase();

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Only allow self-registration for safe roles
    const allowedRoles = ['Operator', 'Model'];
    const requestedRole = allowedRoles.includes(roleName) ? roleName : 'Operator';
    
    const agency = await prisma.agency.findFirst({ where: { inviteCode } });
    if (!agency) return res.status(404).json({ message: 'Invalid invite code' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const rolePermissions = requestedRole === 'Model'
      ? JSON.stringify({ messaging: true, calendar: true })
      : JSON.stringify({ messaging: true, calendar: true, profiles: true, device_setup: true, settings: true });

    let role = await prisma.role.findFirst({ 
      where: { agencyId: agency.id, name: requestedRole } 
    });

    if (!role) {
      const globalTemplate = await prisma.role.findFirst({
        where: { name: requestedRole, agencyId: null }
      });

      role = await prisma.role.create({
        data: {
          name: requestedRole,
          permissions: globalTemplate ? globalTemplate.permissions : rolePermissions,
          agencyId: agency.id
        }
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: fullName,
        roleId: role.id,
        agencyId: agency.id
      }
    });

    res.status(201).json({ message: 'Registered successfully', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

exports.resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      // In production, send token via email
      console.log(`[RESET] Password reset requested for ${email}`);
    }

    // Always respond with success for security (don't reveal if email exists)
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true, agency: true, assignedProfiles: { take: 1, select: { id: true } } }
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      isManager: user.role.isManager,
      isAppOwner: user.role.isAppOwner,
      agencyId: user.agencyId,
      agencyName: user.agency?.name || 'System',
      profileId: user.assignedProfiles?.[0]?.id || null
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
