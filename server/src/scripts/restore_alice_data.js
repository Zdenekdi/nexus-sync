const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function restore() {
  console.log('🚀 Zahajuji obnovu dat pro Alici...');

  // 1. Zajištění agentury
  const agency = await prisma.agency.upsert({
    where: { id: 'agency-01' },
    update: {},
    create: {
      id: 'agency-01',
      name: 'Nexus Sync Central',
      region: 'UK'
    }
  });
  console.log('✅ Agentura zajištěna:', agency.name);

  // 2. Zajištění role Agency Admin pro tuto agenturu
  let adminRole = await prisma.role.findFirst({
    where: { name: 'Agency Admin', agencyId: 'agency-01' }
  });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'Agency Admin',
        isManager: true,
        permissions: JSON.stringify({ manage: true, all: true }),
        agencyId: 'agency-01'
      }
    });
  }

  // 3. Najdeme Alici (podle jména nebo emailu) a propojíme ji
  const existingAlice = await prisma.user.findUnique({ where: { email: 'alice@nexus.sync' } });
  let alice;
  if (existingAlice) {
    alice = await prisma.user.update({
      where: { email: 'alice@nexus.sync' },
      data: {
        name: 'Alice M.',
        agencyId: 'agency-01',
        roleId: adminRole.id
      }
    });
  } else {
    const alicePassword = process.env.ALICE_PASSWORD;
    if (!alicePassword) {
      throw new Error('ALICE_PASSWORD is required when creating alice@nexus.sync');
    }

    alice = await prisma.user.create({
      data: {
        id: 'op-01',
        email: 'alice@nexus.sync',
        name: 'Alice M.',
        password: await bcrypt.hash(alicePassword, 10),
        agencyId: 'agency-01',
        roleId: adminRole.id
      }
    });
  }
  console.log('✅ Alice prolinkována na agenturu a roli Admin.');

  // 4. Obnova modelek a přiřazení k Alici
  const modelData = [
    { id: 'ldn-01', name: 'Diana (Central London)', phoneNumber: '+420 773 227 907' },
    { id: 'manc-05', name: 'Bella (Manchester)', phoneNumber: '+44 7700 900456' },
    { id: 'birm-02', name: 'Chloe (Birmingham)', phoneNumber: '+44 7700 900789' },
    { id: 'leeds-01', name: 'Mia (Leeds)', phoneNumber: '+44 7700 900888' },
    { id: 'newc-03', name: 'Katerina (Newcastle)', phoneNumber: '+44 7700 900999' },
    { id: 'bris-02', name: 'Zoe (Bristol)', phoneNumber: '+44 7700 900777' },
    { id: 'card-01', name: 'Lily (Cardiff)', phoneNumber: '+44 7700 900666' }
  ];

  for (const m of modelData) {
    await prisma.profile.upsert({
      where: { id: m.id },
      update: {
        agencyId: 'agency-01',
        assignees: {
          connect: { id: alice.id }
        }
      },
      create: {
        ...m,
        agencyId: 'agency-01',
        assignees: {
          connect: { id: alice.id }
        }
      }
    });
  }
  console.log(`✅ Obnoveno ${modelData.length} modelek a přiřazeno k Alici.`);

  console.log('🎉 Hotovo! Alice by nyní měla v dashboardu vidět své modelky.');
}

restore()
  .catch(e => console.error('❌ Chyba při obnově:', e))
  .finally(() => prisma.$disconnect());
