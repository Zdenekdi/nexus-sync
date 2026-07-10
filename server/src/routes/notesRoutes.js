const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createNote } = require('../middleware/schemas');
const { getPhoneLookupValues, normalizePhoneNumber } = require('../utils/phoneNumber');

router.use(authMiddleware);

const getScopedProfile = (profileId, agencyId) => {
  if (!profileId) return null;
  return prisma.profile.findFirst({
    where: { id: String(profileId), agencyId: String(agencyId) },
    select: { id: true, phoneNumber: true }
  });
};

// GET /api/notes/:clientPhone  – get all notes for a client (scoped to agency)
router.get('/:clientPhone', async (req, res) => {
  try {
    const { clientPhone } = req.params;
    const { profileId } = req.query;
    const agencyId = req.user.agencyId;
    const profile = await getScopedProfile(profileId, agencyId);
    if (profileId && !profile) return res.status(404).json({ message: 'Profile not found' });
    const phoneVariants = getPhoneLookupValues(clientPhone, { referenceNumber: profile?.phoneNumber });

    const notes = await prisma.clientNote.findMany({
      where: {
        agencyId,
        clientPhone: { in: phoneVariants.length ? phoneVariants : [normalizePhoneNumber(clientPhone)] },
        ...(profileId ? { profileId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notes);
  } catch (err) {
    console.error('GET /notes error:', err);
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

// POST /api/notes  – create a note
router.post('/', validate(createNote), async (req, res) => {
  try {
    const { clientPhone, text, profileId } = req.body;
    const agencyId = req.user.agencyId;
    const authorName = req.user.name || req.user.email;
    const profile = await getScopedProfile(profileId, agencyId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const normalizedClientPhone = normalizePhoneNumber(clientPhone, { referenceNumber: profile.phoneNumber });

    const note = await prisma.clientNote.create({
      data: {
        agencyId,
        profileId,
        clientPhone: normalizedClientPhone,
        text,
        authorName,
      },
    });

    res.status(201).json(note);
  } catch (err) {
    console.error('POST /notes error:', err);
    res.status(500).json({ message: 'Failed to create note' });
  }
});

// DELETE /api/notes/:id  – delete a note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;

    const note = await prisma.clientNote.findFirst({ where: { id, agencyId } });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    await prisma.clientNote.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /notes error:', err);
    res.status(500).json({ message: 'Failed to delete note' });
  }
});

module.exports = router;
