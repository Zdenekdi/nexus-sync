const prisma = require('./db');

const addConstraintIfMissing = async (constraintName, sql) => {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}'
      ) THEN
        ${sql}
      END IF;
    END
    $$;
  `);
};

/**
 * Ensures that critical DB tables and columns exist.
 * This is a workaround for deployment environments where Prisma migrations
 * cannot be run due to permission restrictions.
 */
async function ensureSchemaIntegrity() {
  try {
    console.log('[DB] Ensuring schema integrity...');

    // 1. Create GlobalSetting table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GlobalSetting" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
      );
    `);
    
    // 2. Ensure GlobalSetting unique index
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "GlobalSetting_key_key" ON "GlobalSetting"("key");`);
    } catch (e) { /* skip */ }

    // 3. Create Referral table if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Referral" (
        "id" TEXT NOT NULL,
        "referrerId" TEXT NOT NULL,
        "referredId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
      );
    `);
    
    // 4. Ensure Referral unique index on referredId
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referredId_key" ON "Referral"("referredId");`);
    } catch (e) { /* skip */ }

    // 5. Ensure Agency.referralCode column exists
    try {
      // Check if column exists first to avoid Prisma error noise
      const columnExists = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='Agency' AND column_name='referralCode';
      `);

      if (columnExists.length === 0) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Agency" ADD COLUMN "referralCode" TEXT;`);
        console.log('[DB] Added missing referralCode column to Agency.');
      }
    } catch (err) { 
      console.warn('[DB] ReferralCode check/add skipped:', err.message);
    }
    
    // 6. Ensure unique index on referralCode
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Agency_referralCode_key" ON "Agency"("referralCode");`);
    } catch (e) { /* skip */ }

    // 7. Create external GPS tracker tables if migrations were skipped
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GpsTracker" (
        "id" TEXT NOT NULL,
        "agencyId" TEXT NOT NULL,
        "profileId" TEXT,
        "imei" TEXT NOT NULL,
        "label" TEXT,
        "secretHash" TEXT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "lastSeenAt" TIMESTAMP(3),
        "lastLat" DOUBLE PRECISION,
        "lastLng" DOUBLE PRECISION,
        "lastAccuracy" DOUBLE PRECISION,
        "lastBattery" INTEGER,
        "lastSpeedKph" DOUBLE PRECISION,
        "lastHeading" DOUBLE PRECISION,
        "lastCapturedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GpsTracker_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GpsTrackerLocation" (
        "id" TEXT NOT NULL,
        "trackerId" TEXT NOT NULL,
        "agencyId" TEXT NOT NULL,
        "profileId" TEXT,
        "safetySessionId" TEXT,
        "sosAlertId" TEXT,
        "lat" DOUBLE PRECISION NOT NULL,
        "lng" DOUBLE PRECISION NOT NULL,
        "accuracy" DOUBLE PRECISION,
        "speedKph" DOUBLE PRECISION,
        "heading" DOUBLE PRECISION,
        "battery" INTEGER,
        "capturedAt" TIMESTAMP(3) NOT NULL,
        "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "source" TEXT NOT NULL DEFAULT 'tracker',
        "raw" TEXT,
        CONSTRAINT "GpsTrackerLocation_pkey" PRIMARY KEY ("id")
      );
    `);

    const trackerIndexes = [
      'CREATE UNIQUE INDEX IF NOT EXISTS "GpsTracker_imei_key" ON "GpsTracker"("imei");',
      'CREATE INDEX IF NOT EXISTS "GpsTracker_agencyId_idx" ON "GpsTracker"("agencyId");',
      'CREATE INDEX IF NOT EXISTS "GpsTracker_profileId_idx" ON "GpsTracker"("profileId");',
      'CREATE INDEX IF NOT EXISTS "GpsTracker_active_idx" ON "GpsTracker"("active");',
      'CREATE INDEX IF NOT EXISTS "GpsTrackerLocation_trackerId_idx" ON "GpsTrackerLocation"("trackerId");',
      'CREATE INDEX IF NOT EXISTS "GpsTrackerLocation_agencyId_idx" ON "GpsTrackerLocation"("agencyId");',
      'CREATE INDEX IF NOT EXISTS "GpsTrackerLocation_profileId_idx" ON "GpsTrackerLocation"("profileId");',
      'CREATE INDEX IF NOT EXISTS "GpsTrackerLocation_safetySessionId_idx" ON "GpsTrackerLocation"("safetySessionId");',
      'CREATE INDEX IF NOT EXISTS "GpsTrackerLocation_sosAlertId_idx" ON "GpsTrackerLocation"("sosAlertId");',
      'CREATE INDEX IF NOT EXISTS "GpsTrackerLocation_capturedAt_idx" ON "GpsTrackerLocation"("capturedAt");'
    ];

    for (const indexSql of trackerIndexes) {
      try {
        await prisma.$executeRawUnsafe(indexSql);
      } catch (e) { /* skip */ }
    }

    try {
      await addConstraintIfMissing(
        'GpsTracker_agencyId_fkey',
        'ALTER TABLE "GpsTracker" ADD CONSTRAINT "GpsTracker_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;'
      );
      await addConstraintIfMissing(
        'GpsTracker_profileId_fkey',
        'ALTER TABLE "GpsTracker" ADD CONSTRAINT "GpsTracker_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;'
      );
      await addConstraintIfMissing(
        'GpsTrackerLocation_trackerId_fkey',
        'ALTER TABLE "GpsTrackerLocation" ADD CONSTRAINT "GpsTrackerLocation_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "GpsTracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;'
      );
      await addConstraintIfMissing(
        'GpsTrackerLocation_safetySessionId_fkey',
        'ALTER TABLE "GpsTrackerLocation" ADD CONSTRAINT "GpsTrackerLocation_safetySessionId_fkey" FOREIGN KEY ("safetySessionId") REFERENCES "SafetySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;'
      );
      await addConstraintIfMissing(
        'GpsTrackerLocation_sosAlertId_fkey',
        'ALTER TABLE "GpsTrackerLocation" ADD CONSTRAINT "GpsTrackerLocation_sosAlertId_fkey" FOREIGN KEY ("sosAlertId") REFERENCES "SOSAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;'
      );
    } catch (err) {
      console.warn('[DB] GPS tracker foreign-key check skipped:', err.message);
    }

    // 8. Initialize default GlobalSettings if missing
    const defaultSettings = [
      { key: 'referral_reward_base', value: '50' },
      { key: 'referral_currency', value: 'EUR' }
    ];

    for (const setting of defaultSettings) {
      try {
        const existing = await prisma.globalSetting.findUnique({ where: { key: setting.key } });
        if (!existing) {
          await prisma.globalSetting.create({
            data: {
              id: `init_${setting.key}`,
              key: setting.key,
              value: setting.value
            }
          });
          console.log(`[DB] Initialized global setting: ${setting.key} = ${setting.value}`);
        }
      } catch (err) {
        console.warn(`[DB] Failed to initialize setting ${setting.key}:`, err.message);
      }
    }

    console.log('[DB] Schema integrity check completed.');
  } catch (err) {
    console.error('[DB] Schema integrity check FATAL ERROR:', err.message);
  }
}

module.exports = {
  ensureSchemaIntegrity
};
