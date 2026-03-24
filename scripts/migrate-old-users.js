const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();

const prisma = new PrismaClient();
const oldDbPath = path.join(__dirname, '..', 'prisma', 'prisma', 'dev.db');

async function getAll(db, query) {
  return new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrate() {
  console.log('--- Full Production Data Restoration ---');
  console.log(`Source: ${oldDbPath}`);

  const db = new sqlite3.Database(oldDbPath);

  try {
    // 1. Migrate Agencies
    console.log('Migrating Agencies...');
    const oldAgencies = await getAll(db, "SELECT * FROM Agency");
    for (const a of oldAgencies) {
      await prisma.agency.upsert({
        where: { id: a.id },
        update: { name: a.name, region: a.region, tier: a.tier || a.plan, status: a.status },
        create: { id: a.id, name: a.name, region: a.region, tier: a.tier || a.plan, status: a.status }
      });
    }
    console.log(`Restored ${oldAgencies.length} agencies.`);

    // 2. Migrate Roles
    console.log('Migrating Roles...');
    const oldRoles = await getAll(db, "SELECT * FROM Role");
    for (const r of oldRoles) {
      await prisma.role.upsert({
        where: { id: r.id },
        update: { name: r.name, isAppOwner: r.isSuperAdmin || r.isAppOwner || false, isManager: r.isManager || false, permissions: r.permissions, agencyId: r.agencyId },
        create: { id: r.id, name: r.name, isAppOwner: r.isSuperAdmin || r.isAppOwner || false, isManager: r.isManager || false, permissions: r.permissions, agencyId: r.agencyId }
      });
    }

    // 3. Migrate Users
    console.log('Migrating Users...');
    const oldUsers = await getAll(db, "SELECT * FROM User");
    for (const u of oldUsers) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, password: u.password, roleId: u.roleId, agencyId: u.agencyId },
        create: { id: u.id, email: u.email, name: u.name, password: u.password, roleId: u.roleId, agencyId: u.agencyId }
      });
    }

    // 4. Migrate Profiles (if table exists)
    try {
      console.log('Migrating Profiles...');
      const oldProfiles = await getAll(db, "SELECT * FROM Profile");
      for (const p of oldProfiles) {
        await prisma.profile.upsert({
          where: { id: p.id },
          update: { name: p.name, phone: p.phone, status: p.status, agencyId: p.agencyId },
          create: { id: p.id, name: p.name, phone: p.phone, status: p.status, agencyId: p.agencyId }
        });
      }
    } catch (e) {
      console.log('Profile table not found or already migrated.');
    }

    console.log('--- Migration Successfully Completed ---');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await prisma.$disconnect();
    db.close();
  }
}

migrate();
