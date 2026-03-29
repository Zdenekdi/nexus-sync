const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const prisma = new PrismaClient();
const sqlitePath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');
const db = new sqlite3.Database(sqlitePath);

async function restoreTemplates() {
  try {
    console.log('Fetching profiles from SQLite...');
    const rows = await new Promise((resolve, reject) => {
      db.all("SELECT id, name, data FROM Profile WHERE data IS NOT NULL AND data != ''", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Found ${rows.length} profiles with data in SQLite.`);

    for (const row of rows) {
      console.log(`Checking profile ${row.id}...`);
      // Update Prisma target (Postgres or current SQLite)
      await prisma.profile.update({
        where: { id: row.id },
        data: { data: row.data }
      }).catch(err => {
        console.error(`  [!] Failed to update profile ${row.id}: ${err.message}`);
      });
    }

    console.log('Template restoration complete.');
  } catch (err) {
    console.error('CRITICAL ERROR during restoration:', err);
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

restoreTemplates();
