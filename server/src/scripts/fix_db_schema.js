const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    console.log('--- STARTING DB SCHEMA FIX ---');

    console.log('1. Ensuring GlobalSetting table exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GlobalSetting" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "GlobalSetting_key_key" ON "GlobalSetting"("key");`);

    console.log('2. Ensuring Referral table exists...');
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
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referredId_key" ON "Referral"("referredId");`);

    console.log('3. Ensuring Agency.referralCode column exists...');
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Agency" ADD COLUMN "referralCode" TEXT;`);
      console.log('Column referralCode added.');
    } catch (e) {
      console.log('Column referralCode likely already exists or table is different. Error:', e.message);
    }
    
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Agency_referralCode_key" ON "Agency"("referralCode");`);
    } catch (e) {
      console.log('Index on referralCode likely already exists.');
    }

    console.log('--- DB SCHEMA FIX COMPLETED ---');
  } catch (err) {
    console.error('FATAL ERROR DURING DB FIX:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
