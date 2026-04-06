const { z } = require('zod');

// Reusable atoms
const cuid = z.string().min(1).max(128);
const phone = z.string().max(32).optional();
const text = z.string().min(1).max(10000);
const optionalText = z.string().max(10000).optional().nullable();
const isoDate = z.string().datetime({ offset: true }).or(z.string().datetime());
const severity = z.enum(['warning', 'danger']);
const locationType = z.enum(['incall', 'outcall']);
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

// ── Messages ─────────────────────────────────────────────────────────────────
const createMessage = z.object({
  chatId: cuid,
  text: text,
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  status: z.enum(['sent', 'delivered', 'read']).optional().default('sent'),
  transport: z.enum(['SMS', 'RCS', 'SIP', 'API', 'WEB']).optional().nullable(),
  senderId: cuid.optional().nullable()
});

const updateMessageStatus = z.object({
  status: z.enum(['sent', 'delivered', 'read'])
});

// ── Bookings ─────────────────────────────────────────────────────────────────
const createBooking = z.object({
  profileId: cuid,
  title: z.string().min(1).max(500),
  startTime: isoDate,
  endTime: isoDate,
  locationType: locationType.optional().default('incall'),
  source: z.string().max(50).optional().nullable()
});

const updateBooking = z.object({
  title: z.string().min(1).max(500).optional(),
  startTime: isoDate.optional(),
  endTime: isoDate.optional(),
  locationType: locationType.optional(),
  source: z.string().max(50).optional().nullable()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

// ── Safety Sessions ──────────────────────────────────────────────────────────
const createSafetySession = z.object({
  profileId: cuid,
  bookingId: cuid.optional().nullable(),
  locationType: locationType.optional().default('incall'),
  plannedEndAt: isoDate.optional().nullable(),
  graceMinutes: z.number().int().min(1).max(1440).optional()
});

const safetyLocation = z.object({
  lat: latitude,
  lng: longitude,
  accuracy: z.number().min(0).max(10000).optional().nullable(),
  capturedAt: isoDate.optional()
});

// ── Blacklist ────────────────────────────────────────────────────────────────
const createBlacklist = z.object({
  phone: phone,
  licensePlate: z.string().max(20).optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  description: z.string().min(1).max(5000),
  severity: severity.optional().default('warning')
}).refine(data => data.phone || data.licensePlate || data.name, {
  message: 'At least one identifier (phone, licensePlate, or name) is required'
});

const updateBlacklist = z.object({
  phone: phone,
  licensePlate: z.string().max(20).optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  description: z.string().min(1).max(5000).optional(),
  severity: severity.optional()
});

const blacklistReport = z.object({
  comment: optionalText
});

// ── SOS ──────────────────────────────────────────────────────────────────────
const triggerSOS = z.object({
  profileId: cuid.optional().nullable(),
  type: z.enum(['manual', 'voice', 'timer_expired']).optional().default('manual'),
  lat: latitude.optional().nullable(),
  lng: longitude.optional().nullable(),
  accuracy: z.number().min(0).optional().nullable()
});

const sosLocation = z.object({
  lat: latitude,
  lng: longitude,
  accuracy: z.number().min(0).max(10000).optional().nullable(),
  capturedAt: isoDate.optional()
});

// ── Profiles ─────────────────────────────────────────────────────────────────
const createProfile = z.object({
  name: z.string().min(1).max(200),
  phoneNumber: phone,
  targetAgencyId: cuid.optional().nullable()
});

const patchProfile = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: phone,
  quickReplies: z.array(z.string().max(500)).max(50).optional()
});

const assignUsers = z.object({
  userIds: z.array(cuid).max(100)
});

// ── Client Notes ─────────────────────────────────────────────────────────────
const createNote = z.object({
  profileId: cuid,
  clientPhone: z.string().min(1).max(32),
  text: text
});

// ── QA Records ───────────────────────────────────────────────────────────────
const createQaRecord = z.object({
  profileId: cuid,
  rating: z.number().int().min(1).max(5),
  comment: optionalText,
  category: z.string().max(100).optional().nullable()
});

// ── Call Logs ────────────────────────────────────────────────────────────────
const createCallLog = z.object({
  profileId: cuid,
  from: z.string().min(1).max(64),
  duration: z.number().int().min(0).optional().default(0),
  status: z.enum(['missed', 'answered', 'rejected', 'ringing'])
});

// ── Inventory ────────────────────────────────────────────────────────────────
const createInventoryItem = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(0).optional().default(0),
  threshold: z.number().int().min(0).optional().default(10),
  locationId: cuid
});

const createInventoryLocation = z.object({
  name: z.string().min(1).max(200)
});

module.exports = {
  createMessage,
  updateMessageStatus,
  createBooking,
  updateBooking,
  createSafetySession,
  safetyLocation,
  createBlacklist,
  updateBlacklist,
  blacklistReport,
  triggerSOS,
  sosLocation,
  createProfile,
  patchProfile,
  assignUsers,
  createNote,
  createQaRecord,
  createCallLog,
  createInventoryItem,
  createInventoryLocation
};
