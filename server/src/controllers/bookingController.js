const prisma = require('../services/db');

// GET /api/bookings?profileId=xxx
exports.getBookings = async (req, res) => {
  try {
    const { profileId } = req.query;
    const { role, agencyId } = req.user;
    const isAppOwner = role?.isAppOwner;

    const where = isAppOwner ? {} : { agencyId };
    if (profileId) where.profileId = profileId;

    const bookings = await prisma.booking.findMany({
      where,
      include: { profile: { select: { id: true, name: true } } },
      orderBy: { startTime: 'asc' }
    });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

// POST /api/bookings
exports.createBooking = async (req, res) => {
  try {
    const { profileId, title, startTime, endTime, locationType } = req.body;
    const { role, agencyId } = req.user;
    const isAppOwner = role?.isAppOwner;

    if (!profileId || !title || !startTime || !endTime) {
      return res.status(400).json({ message: 'profileId, title, startTime and endTime are required' });
    }

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || (!isAppOwner && profile.agencyId !== agencyId)) {
      return res.status(403).json({ message: 'Profile not found or access denied' });
    }

    const targetAgencyId = isAppOwner ? profile.agencyId : agencyId;

    const booking = await prisma.booking.create({
      data: {
        profileId,
        agencyId: targetAgencyId,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        locationType: locationType || 'incall',
        status: 'confirmed'
      },
      include: { profile: { select: { id: true, name: true } } }
    });

    console.log(`[Booking] Created: ${title} for profile ${profileId} at ${startTime}`);
    res.status(201).json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};

// PATCH /api/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, startTime, endTime, status, locationType } = req.body;
    const { agencyId } = req.user;

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing || existing.agencyId !== agencyId) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(locationType && { locationType }),
        ...(status && { status })
      }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating booking' });
  }
};

// DELETE /api/bookings/:id
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { agencyId } = req.user;
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing || existing.agencyId !== agencyId) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    await prisma.booking.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting booking' });
  }
};
