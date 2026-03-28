const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/db');

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

    const token = jwt.sign(
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
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        isManager: user.role.isManager,
        isAppOwner: user.role.isAppOwner,
        agencyId: user.agencyId,
        agencyName: user.agency?.name || 'System',
        profileId: user.assignedProfiles?.[0]?.id || null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.registerAgency = async (req, res) => {
  try {
    const { agencyName, fullName, email: rawEmail2, password } = req.body;
    const email = rawEmail2?.toLowerCase();
    
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
          inviteCode: `NEXUS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        }
      });

      const role = await tx.role.create({
        data: {
          name: 'Agency Admin',
          description: 'Full access to agency resources',
          permissions: '*',
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

    // Only allow self-registration for safe roles
    const allowedRoles = ['Operator', 'Model'];
    const requestedRole = allowedRoles.includes(roleName) ? roleName : 'Operator';
    
    const agency = await prisma.agency.findFirst({ where: { inviteCode } });
    if (!agency) return res.status(404).json({ message: 'Invalid invite code' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const rolePermissions = requestedRole === 'Model'
      ? 'profiles:read,messaging:read'
      : 'messaging,profiles';

    let role = await prisma.role.findFirst({ 
      where: { agencyId: agency.id, name: requestedRole } 
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: requestedRole,
          permissions: rolePermissions,
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
