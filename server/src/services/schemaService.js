const prisma = require('./db');

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
      await prisma.$executeRawUnsafe(`ALTER TABLE "Agency" ADD COLUMN "referralCode" TEXT;`);
      console.log('[DB] Added missing referralCode column to Agency.');
    } catch { 
      // Column likely already exists
    }
    
    // 6. Ensure unique index on referralCode
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Agency_referralCode_key" ON "Agency"("referralCode");`);
    } catch (e) { /* skip */ }

    // 7. Initialize default GlobalSettings if missing
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
