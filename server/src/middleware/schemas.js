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
  status: z.enum(['sent', 'delivered', 'read', 'failed'])
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

const updateInventoryItem = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().int().min(0).optional(),
  threshold: z.number().int().min(0).optional(),
  locationId: cuid.optional()
});

const createInventoryLocation = z.object({
  name: z.string().min(1).max(200)
});

// ── Auth ─────────────────────────────────────────────────────────────────────
const login = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256)
});

const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(256)
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number');

const registerAgency = z.object({
  fullName: z.string().min(1).max(200),
  agencyName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: strongPassword,
  referralCode: z.string().max(64).optional()
});

const registerUser = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: strongPassword,
  inviteCode: z.string().min(1).max(64),
  roleName: z.enum(['Operator', 'Model']).optional()
});

const resetPasswordRequest = z.object({
  email: z.string().email().max(320)
});

const refreshToken = z.object({
  refreshToken: z.string().min(1).max(128)
});

const updateAgencySettings = z.object({
  agencyId: cuid.optional(),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional().nullable(),
  region: z.string().min(1).max(100).optional(),
  safetyAlertMode: z.enum(['MANAGERS_AND_ASSIGNED', 'ASSIGNED_ONLY']).optional(),
  defaultGraceMinutes: z.number().int().min(1).max(1440).optional(),
  currency: z.string().max(3).optional(),
  timezone: z.string().max(64).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

const updateRolePermissions = z.object({
  permissions: z.record(z.boolean())
});

const purchaseAddon = z.object({
  addonId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(100).optional().default(1)
});

const createAgency = z.object({
  name: z.string().min(1).max(200),
  region: z.string().min(1).max(100),
  tier: z.string().max(50).optional().default('Standard'),
  plan: z.string().max(50).optional().default('Standard'),
  email: z.string().email().max(320).optional(),
  ownerEmail: z.string().email().max(320).optional(),
  ownerName: z.string().max(200).optional()
});

const addUser = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: strongPassword,
  roleId: cuid.optional(),
  roleName: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  agencyId: cuid.optional()
});

// ── Subscriptions ────────────────────────────────────────────────────────────
const startSubscription = z.object({
  plan: z.enum(['MONTHLY', 'SEMI_ANNUAL', 'ANNUAL']),
  paymentRef: z.string().max(256).optional().nullable(),
  amountPaid: z.number().min(0).optional().nullable(),
  currency: z.enum(['CZK', 'EUR', 'GBP', 'USD']).optional().default('CZK'),
  note: z.string().max(1000).optional().nullable()
});

const cancelSubscription = z.object({
  note: z.string().max(1000).optional().nullable()
});

const startTrial = z.object({
  agencyId: cuid,
  days: z.number().int().min(1).max(365).optional().default(14),
  note: z.string().max(1000).optional().nullable()
});

// ── Device ───────────────────────────────────────────────────────────────────
const registerPushToken = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(['android', 'ios', 'web']).optional().default('android')
});

const verifyDeviceBinding = z.object({
  installationId: z.string().min(1).max(256),
  deviceModel: z.string().max(200).optional().nullable(),
  osVersion: z.string().max(50).optional().nullable()
});

const revokeDeviceBinding = z.object({
  bindingId: cuid
});

// ── SIP ──────────────────────────────────────────────────────────────────────
const setSipConfig = z.object({
  sipUser: z.string().min(1).max(128).optional(),
  sipPassword: z.string().min(1).max(256).optional(),
  sipDomain: z.string().max(256).optional(),
  sipProxy: z.string().max(256).optional()
});

// ── Admin ────────────────────────────────────────────────────────────────────
const updateGlobalFeature = z.object({
  value: z.string().max(10000)
});

// ── Device Relay ─────────────────────────────────────────────────────────────
const relayMessage = z.object({
  installationId: z.string().min(1).max(256),
  deviceId: z.string().max(128).optional(),
  secret: z.string().max(256).optional(),
  type: z.string().max(32).optional(),
  from: z.string().max(64).optional(),
  to: z.string().max(64).optional(),
  body: z.string().max(5000).optional(),
  text: z.string().max(5000).optional(),
  content: z.string().max(5000).optional(),
  transport: z.string().max(16).optional(),
  timestamp: z.number().optional()
});

const mobileMessage = z.object({
  secret: z.string().min(1).max(256),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  body: z.string().max(5000).optional(),
  text: z.string().max(5000).optional(),
  transport: z.string().max(16).optional()
});

const mobileCall = z.object({
  secret: z.string().min(1).max(256),
  from: z.string().min(1).max(64),
  state: z.string().max(32).optional(),
  duration: z.number().int().min(0).optional()
});

// ── QA Update ────────────────────────────────────────────────────────────────
const updateQaRecord = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: optionalText,
  category: z.string().max(100).optional().nullable()
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
  updateQaRecord,
  createCallLog,
  createInventoryItem,
  updateInventoryItem,
  createInventoryLocation,
  login,
  registerAgency,
  registerUser,
  resetPasswordRequest,
  refreshToken,
  updateAgencySettings,
  updateRolePermissions,
  purchaseAddon,
  createAgency,
  addUser,
  startSubscription,
  cancelSubscription,
  startTrial,
  registerPushToken,
  verifyDeviceBinding,
  revokeDeviceBinding,
  setSipConfig,
  updateGlobalFeature,
  relayMessage,
  mobileMessage,
  mobileCall
};
