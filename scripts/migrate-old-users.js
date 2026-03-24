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
        update: { 
          name: a.name, 
          region: a.region, 
          plan: a.tier || a.plan || 'Standard'
        },
        create: { 
          id: a.id, 
          name: a.name, 
          region: a.region, 
          plan: a.tier || a.plan || 'Standard'
        }
      });
    }
    console.log(`Restored ${oldAgencies.length} agencies.`);

    // 2. Migrate Roles
    console.log('Migrating Roles...');
    const oldRoles = await getAll(db, "SELECT * FROM Role");
    for (const r of oldRoles) {
      await prisma.role.upsert({
        where: { id: r.id },
        update: { 
          name: r.name, 
          isAppOwner: !!(r.isSuperAdmin || r.isAppOwner), 
          isManager: !!(r.isManager), 
          permissions: r.permissions || '*', 
          agencyId: r.agencyId 
        },
        create: { 
          id: r.id, 
          name: r.name, 
          isAppOwner: !!(r.isSuperAdmin || r.isAppOwner), 
          isManager: !!(r.isManager), 
          permissions: r.permissions || '*', 
          agencyId: r.agencyId 
        }
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

    // 4. Migrate Profiles
    try {
      console.log('Migrating Profiles...');
      const oldProfiles = await getAll(db, "SELECT * FROM Profile");
      for (const p of oldProfiles) {
        await prisma.profile.upsert({
          where: { id: p.id },
          update: { 
            name: p.name, 
            phoneNumber: p.phone || p.phoneNumber, 
            status: p.status || 'offline', 
            agencyId: p.agencyId 
          },
          create: { 
            id: p.id, 
            name: p.name, 
            phoneNumber: p.phone || p.phoneNumber, 
            status: p.status || 'offline', 
            agencyId: p.agencyId 
          }
        });
      }
    } catch (e) {
      console.log('Profile table not found or already migrated.');
    }

    // 5. Migrate Chats
    try {
      console.log('Migrating Chats...');
      const oldChats = await getAll(db, "SELECT * FROM Chat");
      for (const c of oldChats) {
        await prisma.chat.upsert({
          where: { id: c.id },
          update: { externalId: c.externalId, profileId: c.profileId, agencyId: c.agencyId, lastMessageAt: new Date(c.lastMessageAt || Date.now()) },
          create: { id: c.id, externalId: c.externalId, profileId: c.profileId, agencyId: c.agencyId, lastMessageAt: new Date(c.lastMessageAt || Date.now()) }
        });
      }
    } catch (e) {
      console.log('Chat table not found or empty.');
    }

    // 6. Migrate Messages
    try {
      console.log('Migrating Messages...');
      const oldMsgs = await getAll(db, "SELECT * FROM Message");
      for (const m of oldMsgs) {
        await prisma.message.upsert({
          where: { id: m.id },
          update: { chatId: m.chatId, direction: m.direction, text: m.text, status: m.status || 'sent', senderId: m.senderId, createdAt: new Date(m.createdAt) },
          create: { id: m.id, chatId: m.chatId, direction: m.direction, text: m.text, status: m.status || 'sent', senderId: m.senderId, createdAt: new Date(m.createdAt) }
        });
      }
    } catch (e) {
      console.log('Message table not found or empty.');
    }

    // 7. Migrate Assignments (Alice to Diana etc.)
    try {
      console.log('Migrating Profile Assignments...');
      const oldAssigns = await getAll(db, "SELECT * FROM _ProfileAssignees");
      // Format: A = ProfileID, B = UserID
      for (const rel of oldAssigns) {
        await prisma.user.update({
          where: { id: rel.B },
          data: { assignedProfiles: { connect: { id: rel.A } } }
        });
      }
      console.log(`Restored ${oldAssigns.length} profile assignments.`);
    } catch (e) {
      console.log('Assignment table (_ProfileAssignees) not found or empty.');
    }

    console.log('--- Full Migration Successfully Completed ---');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await prisma.$disconnect();
    db.close();
  }
}

migrate();
