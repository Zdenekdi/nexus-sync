const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- DATABASE DIAGNOSTICS ---');
    
    // Check tables in public schema
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
    console.log('Existing tables:', tables.map(t => t.tablename).join(', '));

    const tableList = tables.map(t => t.tablename);
    
    if (tableList.includes('GlobalSetting')) {
      const settings = await prisma.globalSetting.findMany();
      console.log('GlobalSetting records:', settings.length);
    } else {
      console.error('MISSING TABLE: GlobalSetting');
    }

    if (tableList.includes('Agency')) {
      const agencyCols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Agency'`;
      const hasRefCode = agencyCols.some(c => c.column_name === 'referralCode');
      console.log('Agency has referralCode column:', hasRefCode);
    } else {
      console.error('MISSING TABLE: Agency');
    }

    if (tableList.includes('Referral')) {
      console.log('Referral table exists.');
    } else {
      console.error('MISSING TABLE: Referral');
    }

  } catch (err) {
    console.error('DIAGNOSTICS ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
