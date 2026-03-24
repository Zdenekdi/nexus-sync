const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const prisma = new PrismaClient();
const oldDbPath = path.join(__dirname, '..', 'prisma', 'prisma', 'dev.db');

async function migrate() {
  console.log('--- Migrating users from old database ---');
  console.log(`Source: ${oldDbPath}`);

  const db = new sqlite3.Database(oldDbPath);

  db.all("SELECT * FROM User", async (err, rows) => {
    if (err) {
      console.error('Error reading old DB:', err.message);
      process.exit(1);
    }

    console.log(`Found ${rows.length} users in old database.`);

    // Get roles
    const roles = await prisma.role.findMany();
    
    for (const row of rows) {
      console.log(`Migrating: ${row.email}...`);
      
      // Try to match the role name if it existed in the old DB (if any) or identify by isAppOwner logic
      const targetRole = roles.find(r => r.name === 'App Owner') || roles[0];
      
      try {
        await prisma.user.upsert({
          where: { email: row.email },
          update: {
            name: row.name,
            password: row.password,
          },
          create: {
            email: row.email,
            name: row.name,
            password: row.password,
            roleId: (row.isSuperAdmin || row.email === 'dias.zd@gmail.com') ? targetRole.id : roles.find(r => r.name === 'Operator')?.id || roles[0].id,
          }
        });
      } catch (e) {
        console.error(`Failed to migrate ${row.email}:`, e.message);
      }
    }

    console.log('--- Migration Complete ---');
    await prisma.$disconnect();
    db.close();
  });
}

migrate();
