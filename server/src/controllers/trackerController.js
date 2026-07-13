const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../services/db');
const logger = require('../services/logger');
const { getIO } = require('../services/socket');
const { isManagerRole } = require('../utils/authz');

const TOKEN_PREFIX = 'nxtrk_';
const ACTIVE_SESSION_STATES = ['CHECKED_IN', 'GRACE', 'ESCALATED'];
const ACTIVE_SOS_STATES = ['active', 'acknowledged'];

const normalizeImei = (imei) => String(imei || '').trim().replace(/\s+/g, '').toUpperCase();

const toPublicTracker = (tracker) => {
  if (!tracker) return null;
  const { secretHash, ...safe } = tracker;
  return safe;
};

const generateSecret = () => crypto.randomBytes(24).toString('base64url');

const buildTrackerToken = (trackerId, secret) => `${TOKEN_PREFIX}${trackerId}.${secret}`;

const baseApiUrl = (req) => {
  const configured = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return configured.replace(/\/+$/, '').replace(/\/api$/, '');
};

const parseDateTime = (value, fallback = new Date()) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const parseNullableNumber = (value, { name, min, max, integer = false } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${name}`);
  if (integer && !Number.isInteger(parsed)) throw new Error(`Invalid ${name}`);
  if (min !== undefined && parsed < min) throw new Error(`Invalid ${name}`);
  if (max !== undefined && parsed > max) throw new Error(`Invalid ${name}`);
  return parsed;
};

const parseDmCoordinate = (value, hemisphere, degreeDigits) => {
  const raw = String(value || '');
  if (!raw || !hemisphere) return null;
  const degrees = Number(raw.slice(0, degreeDigits));
  const minutes = Number(raw.slice(degreeDigits));
  if (!Number.isFinite(degrees) || !Number.isFinite(minutes)) return null;
  let decimal = degrees + (minutes / 60);
  if (hemisphere === 'S' || hemisphere === 'W') decimal *= -1;
  return decimal;
};

const validateNmeaChecksum = (sentence) => {
  const starIndex = sentence.indexOf('*');
  if (starIndex === -1) return true;

  const expected = sentence.slice(starIndex + 1).trim().slice(0, 2).toUpperCase();
  const body = sentence.replace(/^\$/, '').slice(0, starIndex - (sentence.startsWith('$') ? 1 : 0));
  const actual = [...body].reduce((acc, ch) => acc ^ ch.charCodeAt(0), 0).toString(16).toUpperCase().padStart(2, '0');
  return actual === expected;
};

const parseGprmc = (input) => {
  const sentence = String(input || '').trim();
  if (!sentence) throw new Error('Missing GPRMC sentence');
  if (!validateNmeaChecksum(sentence)) throw new Error('Invalid GPRMC checksum');

  const clean = sentence.replace(/^\$/, '').split('*')[0];
  const parts = clean.split(',');
  const type = parts[0];
  if (!type.endsWith('RMC')) throw new Error('Unsupported NMEA sentence');
  if (parts[2] !== 'A') throw new Error('GPS fix is not active');

  const lat = parseDmCoordinate(parts[3], parts[4], 2);
  const lng = parseDmCoordinate(parts[5], parts[6], 3);
  if (lat === null || lng === null) throw new Error('Invalid GPRMC coordinates');

  const speedKnots = Number(parts[7] || 0);
  const heading = Number(parts[8]);
  let capturedAt = new Date();

  const time = parts[1] || '';
  const date = parts[9] || '';
  if (time.length >= 6 && date.length === 6) {
    const day = Number(date.slice(0, 2));
    const month = Number(date.slice(2, 4)) - 1;
    const yy = Number(date.slice(4, 6));
    const year = yy >= 70 ? 1900 + yy : 2000 + yy;
    const hour = Number(time.slice(0, 2));
    const minute = Number(time.slice(2, 4));
    const second = Number(time.slice(4, 6));
    const candidate = new Date(Date.UTC(year, month, day, hour, minute, second));
    if (!Number.isNaN(candidate.getTime())) capturedAt = candidate;
  }

  return {
    lat,
    lng,
    speedKph: Number.isFinite(speedKnots) ? speedKnots * 1.852 : null,
    heading: Number.isFinite(heading) ? heading : null,
    capturedAt,
    raw: sentence
  };
};

const extractTokenParts = (req) => {
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const rawToken = req.headers['x-tracker-token'] || bearer || req.body?.token || req.query?.token;

  if (rawToken && String(rawToken).startsWith(TOKEN_PREFIX)) {
    const tokenBody = String(rawToken).slice(TOKEN_PREFIX.length);
    const [trackerId, secret] = tokenBody.split('.');
    return { trackerId, secret };
  }

  return {
    trackerId: req.body?.trackerId || req.query?.trackerId || null,
    secret: req.headers['x-tracker-secret'] || req.body?.secret || req.query?.secret || null,
    imei: req.body?.imei || req.query?.imei || null
  };
};

class TrackerController {
  async _resolveAgencyId(req, profileId) {
    const isAppOwner = req.user?.role?.isAppOwner;
    let agencyId = req.user?.agencyId || null;
    let profile = null;

    if (profileId) {
      profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { id: true, agencyId: true, name: true }
      });
      if (!profile) return { error: { status: 404, message: 'Profile not found' } };
      if (!isAppOwner && profile.agencyId !== agencyId) {
        return { error: { status: 403, message: 'Tracker profile must belong to your agency' } };
      }
      if (!agencyId && isAppOwner) agencyId = profile.agencyId;
    }

    if (!agencyId) return { error: { status: 403, message: 'Agency context required' } };
    return { agencyId, profile };
  }

  async _requireTrackerAccess(req, res, id) {
    const tracker = await prisma.gpsTracker.findUnique({
      where: { id },
      include: { profile: { select: { id: true, name: true } } }
    });
    if (!tracker) {
      res.status(404).json({ message: 'Tracker not found' });
      return null;
    }
    if (!req.user?.role?.isAppOwner && tracker.agencyId !== req.user?.agencyId) {
      res.status(403).json({ message: 'Access denied' });
      return null;
    }
    return tracker;
  }

  _ingestInfo(req, tracker, secret) {
    const url = `${baseApiUrl(req)}/api/trackers/ingest`;
    const token = buildTrackerToken(tracker.id, secret);
    return {
      url,
      token,
      jsonExample: {
        token,
        lat: 50.0875,
        lng: 14.4213,
        accuracy: 12,
        battery: 87,
        capturedAt: new Date().toISOString()
      },
      queryExample: `${url}?token=${encodeURIComponent(token)}&lat=50.0875&lng=14.4213`
    };
  }

  async list(req, res) {
    try {
      const isAppOwner = req.user?.role?.isAppOwner;
      const agencyId = isAppOwner && req.query.agencyId ? req.query.agencyId : req.user?.agencyId;
      if (!agencyId && !isAppOwner) return res.status(403).json({ message: 'Agency context required' });

      const trackers = await prisma.gpsTracker.findMany({
        where: {
          ...(agencyId ? { agencyId } : {}),
          ...(req.query.active === 'false' ? {} : { active: true })
        },
        include: {
          profile: { select: { id: true, name: true } },
          locations: { take: 1, orderBy: { capturedAt: 'desc' } }
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.json({ trackers: trackers.map(toPublicTracker) });
    } catch (error) {
      logger.error('[Tracker] list error:', error);
      res.status(500).json({ message: 'Failed to load trackers' });
    }
  }

  async pair(req, res) {
    try {
      if (!isManagerRole(req.user?.role)) return res.status(403).json({ message: 'Manager role required' });
      const { imei, profileId, label } = req.body;
      const normalizedImei = normalizeImei(imei);
      const { agencyId, error } = await this._resolveAgencyId(req, profileId);
      if (error) return res.status(error.status).json({ message: error.message });

      const existing = await prisma.gpsTracker.findUnique({ where: { imei: normalizedImei } });
      if (existing && existing.agencyId !== agencyId && !req.user?.role?.isAppOwner) {
        return res.status(409).json({ message: 'Tracker IMEI is already paired to another agency' });
      }

      const secret = generateSecret();
      const secretHash = await bcrypt.hash(secret, 12);
      const data = {
        agencyId,
        profileId: profileId || null,
        imei: normalizedImei,
        label: label || null,
        secretHash,
        active: true,
        lastSeenAt: null
      };

      const tracker = existing
        ? await prisma.gpsTracker.update({ where: { id: existing.id }, data })
        : await prisma.gpsTracker.create({ data });

      res.status(existing ? 200 : 201).json({
        tracker: toPublicTracker(tracker),
        ingest: this._ingestInfo(req, tracker, secret),
        message: 'Tracker paired. Store the token now; it will not be shown again.'
      });
    } catch (error) {
      logger.error('[Tracker] pair error:', error);
      res.status(500).json({ message: 'Failed to pair tracker' });
    }
  }

  async rotateSecret(req, res) {
    try {
      if (!isManagerRole(req.user?.role)) return res.status(403).json({ message: 'Manager role required' });
      const tracker = await this._requireTrackerAccess(req, res, req.params.id);
      if (!tracker) return;
      const secret = generateSecret();
      const secretHash = await bcrypt.hash(secret, 12);
      const updated = await prisma.gpsTracker.update({
        where: { id: tracker.id },
        data: { secretHash, active: true }
      });

      res.json({
        tracker: toPublicTracker(updated),
        ingest: this._ingestInfo(req, updated, secret),
        message: 'Tracker token rotated. Store the token now; it will not be shown again.'
      });
    } catch (error) {
      logger.error('[Tracker] rotate secret error:', error);
      res.status(500).json({ message: 'Failed to rotate tracker token' });
    }
  }

  async unpair(req, res) {
    try {
      if (!isManagerRole(req.user?.role)) return res.status(403).json({ message: 'Manager role required' });
      const tracker = await this._requireTrackerAccess(req, res, req.params.id);
      if (!tracker) return;
      await prisma.gpsTracker.update({ where: { id: tracker.id }, data: { active: false } });
      res.json({ ok: true });
    } catch (error) {
      logger.error('[Tracker] unpair error:', error);
      res.status(500).json({ message: 'Failed to unpair tracker' });
    }
  }

  async locations(req, res) {
    try {
      const tracker = await this._requireTrackerAccess(req, res, req.params.id);
      if (!tracker) return;
      const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 500);
      const locations = await prisma.gpsTrackerLocation.findMany({
        where: { trackerId: tracker.id },
        take: limit,
        orderBy: { capturedAt: 'desc' }
      });
      res.json({ locations });
    } catch (error) {
      logger.error('[Tracker] locations error:', error);
      res.status(500).json({ message: 'Failed to load tracker locations' });
    }
  }

  async _authenticateIngest(req) {
    const { trackerId, secret, imei } = extractTokenParts(req);
    if (!secret || (!trackerId && !imei)) {
      return { error: { status: 401, message: 'Missing tracker token or secret' } };
    }

    const tracker = trackerId
      ? await prisma.gpsTracker.findUnique({ where: { id: trackerId } })
      : await prisma.gpsTracker.findUnique({ where: { imei: normalizeImei(imei) } });

    if (!tracker) return { error: { status: 404, message: 'Tracker not found' } };
    if (!tracker.active) return { error: { status: 410, message: 'Tracker is not active' } };

    const ok = await bcrypt.compare(String(secret), tracker.secretHash);
    if (!ok) return { error: { status: 401, message: 'Invalid tracker secret' } };

    return { tracker };
  }

  _parseLocation(req) {
    const source = req.body?.gprmc || req.body?.nmea || req.query?.gprmc || req.query?.nmea;
    if (source) {
      return parseGprmc(source);
    }

    const lat = Number(req.body?.lat ?? req.query?.lat);
    const lng = Number(req.body?.lng ?? req.query?.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates');
    }

    const speed = req.body?.speedKph ?? req.body?.speed ?? req.query?.speedKph ?? req.query?.speed;
    const heading = req.body?.heading ?? req.query?.heading;
    const battery = req.body?.battery ?? req.query?.battery;
    const accuracy = req.body?.accuracy ?? req.query?.accuracy;

    return {
      lat,
      lng,
      accuracy: parseNullableNumber(accuracy, { name: 'accuracy', min: 0, max: 10000 }),
      speedKph: parseNullableNumber(speed, { name: 'speed', min: 0, max: 1000 }),
      heading: parseNullableNumber(heading, { name: 'heading', min: 0, max: 360 }),
      battery: parseNullableNumber(battery, { name: 'battery percentage', min: 0, max: 100, integer: true }),
      capturedAt: parseDateTime(req.body?.capturedAt ?? req.query?.capturedAt, new Date()),
      raw: req.body?.raw || null
    };
  }

  async ingest(req, res) {
    try {
      const { tracker, error } = await this._authenticateIngest(req);
      if (error) return res.status(error.status).json({ message: error.message });

      let point;
      try {
        point = this._parseLocation(req);
      } catch (parseError) {
        return res.status(400).json({ message: parseError.message });
      }

      const activeSession = tracker.profileId
        ? await prisma.safetySession.findFirst({
          where: {
            agencyId: tracker.agencyId,
            profileId: tracker.profileId,
            state: { in: ACTIVE_SESSION_STATES }
          },
          orderBy: { updatedAt: 'desc' }
        })
        : null;

      const activeSos = tracker.profileId
        ? await prisma.sOSAlert.findFirst({
          where: {
            agencyId: tracker.agencyId,
            profileId: tracker.profileId,
            status: { in: ACTIVE_SOS_STATES }
          },
          orderBy: { createdAt: 'desc' }
        })
        : null;

      const location = await prisma.gpsTrackerLocation.create({
        data: {
          trackerId: tracker.id,
          agencyId: tracker.agencyId,
          profileId: tracker.profileId || null,
          safetySessionId: activeSession?.id || null,
          sosAlertId: activeSos?.id || null,
          lat: point.lat,
          lng: point.lng,
          accuracy: point.accuracy,
          speedKph: point.speedKph,
          heading: point.heading,
          battery: point.battery,
          capturedAt: point.capturedAt,
          raw: point.raw || req.body?.gprmc || req.body?.nmea || null
        }
      });

      if (activeSession) {
        await prisma.safetyLocationPoint.create({
          data: {
            sessionId: activeSession.id,
            lat: point.lat,
            lng: point.lng,
            accuracy: point.accuracy,
            capturedAt: point.capturedAt
          }
        });
      }

      if (activeSos) {
        await prisma.sOSLocationUpdate.create({
          data: {
            sosAlertId: activeSos.id,
            lat: point.lat,
            lng: point.lng,
            accuracy: point.accuracy,
            capturedAt: point.capturedAt
          }
        });
        await prisma.sOSAlert.update({
          where: { id: activeSos.id },
          data: { lat: point.lat, lng: point.lng, accuracy: point.accuracy }
        });
      }

      await prisma.gpsTracker.update({
        where: { id: tracker.id },
        data: {
          lastSeenAt: new Date(),
          lastLat: point.lat,
          lastLng: point.lng,
          lastAccuracy: point.accuracy,
          lastBattery: point.battery,
          lastSpeedKph: point.speedKph,
          lastHeading: point.heading,
          lastCapturedAt: point.capturedAt
        }
      });

      try {
        const io = getIO();
        const payload = {
          trackerId: tracker.id,
          profileId: tracker.profileId,
          lat: point.lat,
          lng: point.lng,
          accuracy: point.accuracy,
          battery: point.battery,
          capturedAt: point.capturedAt,
          safetySessionId: activeSession?.id || null,
          sosAlertId: activeSos?.id || null
        };
        io.to(`agency_${tracker.agencyId}`).emit('tracker_location_update', payload);
        if (activeSos) io.to(`agency_${tracker.agencyId}`).emit('sos_location_update', { alertId: activeSos.id, ...payload });
      } catch (socketError) {
        logger.warn('[Tracker] socket emit failed:', socketError.message);
      }

      res.status(201).json({
        ok: true,
        trackerId: tracker.id,
        locationId: location.id,
        linkedSafetySessionId: activeSession?.id || null,
        linkedSosAlertId: activeSos?.id || null
      });
    } catch (error) {
      logger.error('[Tracker] ingest error:', error);
      res.status(500).json({ message: 'Failed to ingest tracker location' });
    }
  }
}

module.exports = new TrackerController();
module.exports._private = { parseGprmc, normalizeImei, buildTrackerToken };
