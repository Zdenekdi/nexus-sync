const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/db');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, agency: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        agencyId: user.agencyId, 
        role: user.role.name,
        isSuperAdmin: user.role.isSuperAdmin 
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
        isSuperAdmin: user.role.isSuperAdmin,
        agencyId: user.agencyId,
        agencyName: user.agency?.name || 'System'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true, agency: true }
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      isSuperAdmin: user.role.isSuperAdmin,
      agencyId: user.agencyId,
      agencyName: user.agency?.name || 'System'
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
