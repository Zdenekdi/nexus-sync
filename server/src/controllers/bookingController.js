const prisma = require('../services/db');
const { normalizePhoneNumber } = require('../utils/phoneNumber');

// GET /api/bookings?profileId=xxx
exports.getBookings = async (req, res) => {
  try {
    const { profileId } = req.query;
    const userRole = req.user?.role;
    const agencyId = req.user?.agencyId;
    
    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    const internalRole = roleName.toUpperCase();

    // RESTRICTED: App Owner (Privacy), Agency Admin, Manager
    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ message: 'Access denied: Infrastructure and high-level management do not access Schedule for privacy reasons.' });
    }

    // Must have an agencyId context
    if (!agencyId) {
      return res.status(400).json({ message: 'Missing agency context for booking fetch.' });
    }

    const where = { agencyId: String(agencyId) };
    if (profileId) where.profileId = String(profileId);

    const bookings = await prisma.booking.findMany({
      where,
      include: { profile: { select: { id: true, name: true } } },
      orderBy: { startTime: 'asc' }
    });
    res.json(bookings);
  } catch (error) {
    console.error('[Booking] Fetch error:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

// POST /api/bookings
exports.createBooking = async (req, res) => {
  try {
    const { profileId, title, startTime, endTime, locationType, clientPhone, clientName, price } = req.body;
    const userRole = req.user?.role;
    const agencyId = req.user?.agencyId;
    
    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    const internalRole = roleName.toUpperCase();

    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ message: 'Access denied: Modifying schedule restricted.' });
    }

    if (!agencyId) {
      return res.status(400).json({ message: 'Missing agency context for booking creation.' });
    }

    if (!profileId || !title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields (profileId, title, startTime, endTime).' });
    }

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.agencyId !== agencyId) {
      return res.status(403).json({ message: 'Access denied to profile or profile does not exist.' });
    }

    // 1. Handle Client CRM Integration
    let clientId = null;
    const normalizedClientPhone = clientPhone
      ? normalizePhoneNumber(clientPhone, { referenceNumber: profile.phoneNumber })
      : null;
    if (clientPhone) {
      const client = await prisma.client.upsert({
        where: {
          agencyId_phone: {
            agencyId: String(agencyId),
            phone: String(normalizedClientPhone)
          }
        },
        update: {
          totalSpent: { increment: Number(price || 0) },
          lastVisit: new Date(startTime),
          ...(clientName && { name: clientName })
        },
        create: {
          agencyId: String(agencyId),
          phone: String(normalizedClientPhone),
          name: clientName || 'Anonymous',
          totalSpent: Number(price || 0),
          lastVisit: new Date(startTime)
        }
      });
      clientId = client.id;
    }

    const booking = await prisma.booking.create({
      data: {
        profileId: String(profileId),
        agencyId: String(agencyId),
        clientId,
        clientPhone: normalizedClientPhone,
        title,
        price: Number(price || 0),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        locationType: locationType || 'incall'
      },
      include: { 
        profile: { select: { id: true, name: true } },
        client: true
      }
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('[Booking] Create error:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};

// PATCH /api/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const agencyId = req.user?.agencyId;
    
    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    const internalRole = roleName.toUpperCase();

    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!agencyId) {
      return res.status(400).json({ message: 'Missing agency context.' });
    }

    const existing = await prisma.booking.findUnique({ where: { id: String(id) } });
    if (!existing || existing.agencyId !== String(agencyId)) {
      return res.status(404).json({ message: 'Booking not found or access denied.' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...(req.body.title && { title: req.body.title }),
        ...(req.body.startTime && { startTime: new Date(req.body.startTime) }),
        ...(req.body.endTime && { endTime: new Date(req.body.endTime) }),
        ...(req.body.locationType && { locationType: req.body.locationType })
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('[Booking] Update error:', error);
    res.status(500).json({ message: 'Error updating booking' });
  }
};

// DELETE /api/bookings/:id
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const agencyId = req.user?.agencyId;
    
    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    const internalRole = roleName.toUpperCase();

    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!agencyId) {
      return res.status(400).json({ message: 'Missing agency context.' });
    }

    const existing = await prisma.booking.findUnique({ where: { id: String(id) } });
    if (!existing || existing.agencyId !== String(agencyId)) {
      return res.status(404).json({ message: 'Booking not found or access denied.' });
    }
    
    await prisma.booking.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('[Booking] Delete error:', error);
    res.status(500).json({ message: 'Error deleting booking' });
  }
};
