const prisma = require('../services/db');

exports.getChats = async (req, res) => {
  try {
    const { role, agencyId } = req.user;
    const isSuperAdmin = role?.isSuperAdmin;
    const whereClause = isSuperAdmin ? {} : { agencyId };
    const chats = await prisma.chat.findMany({
      where: whereClause,
      include: { 
        profile: { select: { id: true, name: true } }, 
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: { select: { messages: true } } 
      },
      orderBy: { lastMessageAt: 'desc' }
    });
    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
};

exports.getProfileChats = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { role, agencyId } = req.user;
    const isSuperAdmin = role?.isSuperAdmin;
    const whereClause = { profileId };
    if (!isSuperAdmin) whereClause.agencyId = agencyId;
    const chats = await prisma.chat.findMany({
      where: whereClause,
      include: { 
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: { select: { messages: true } } 
      },
      orderBy: { lastMessageAt: 'desc' }
    });
    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching profile chats' });
  }
};
