const prisma = require('./server/src/services/db');

async function migrate() {
  try {
    console.log('--- MANUÁLNÍ MIGRACE ---');
    
    // 1. Přidání extraFeatures do Agency
    try {
        await prisma.$executeRaw`ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "extraFeatures" JSONB DEFAULT '{}'::jsonb;`;
        console.log('Funguje: extraFeatures přidáno (nebo již existuje).');
    } catch (e) {
        console.log('INFO: extraFeatures možná nelze přidat standardně, zkusíme to bez IF NOT EXISTS:', e.message);
        // Fallback pro DB, které IF NOT EXISTS nepodporují u ADD COLUMN (Postgres od v10+ by měl)
    }

    // 2. Přidání isAppOwner a minTier do Role
    try {
        await prisma.$executeRaw`ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "isAppOwner" BOOLEAN DEFAULT false;`;
        await prisma.$executeRaw`ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "minTier" TEXT DEFAULT 'Pro';`;
        console.log('Funguje: Pole isAppOwner a minTier přidána.');
    } catch (e) {
        console.log('INFO: Chyba při úpravě tabulky Role:', e.message);
    }

    console.log('--- KONEC MIGRACE ---');
  } catch (err) {
    console.error('FATÁLNÍ CHYBA PŘI MIGRACI:', err);
  } finally {
    process.exit();
  }
}

migrate();
