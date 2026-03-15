const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seed started...');

  // 1. Create Default Agency
  const nexusAgency = await prisma.agency.upsert({
    where: { id: 'nexus-main' },
    update: {},
    create: {
      id: 'nexus-main',
      name: 'Nexus HQ',
      region: 'UK',
      plan: 'Enterprise',
    },
  });

  // 2. Create Global Roles
  const roles = [
    { name: 'Super Admin', permissions: JSON.stringify(['all']), isSuperAdmin: true, agencyId: null },
    { name: 'Regional Manager', permissions: JSON.stringify(['view_agency', 'manage_operators', 'view_stats']), isSuperAdmin: false, agencyId: null },
    { name: 'Operator', permissions: JSON.stringify(['view_messages', 'send_messages', 'view_profiles']), isSuperAdmin: false, agencyId: null },
    { name: 'Model', permissions: JSON.stringify(['view_profile']), isSuperAdmin: false, agencyId: null },
  ];

  for (const roleData of roles) {
    const existing = await prisma.role.findFirst({
      where: { name: roleData.name, agencyId: roleData.agencyId },
    });
    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: { permissions: roleData.permissions, isSuperAdmin: roleData.isSuperAdmin },
      });
    } else {
      await prisma.role.create({ data: roleData });
    }
  }

  // 3. Create Super Admin User
  const adminRole = await prisma.role.findFirst({ where: { name: 'Super Admin' } });
  const hashedPassword = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@nexus.ai' },
    update: { password: hashedPassword, agencyId: null },
    create: {
      email: 'admin@nexus.ai',
      password: hashedPassword,
      name: 'Nexus Alpha',
      roleId: adminRole.id,
      agencyId: null, // Super Admin is global
    },
  });

  // 4. Create Regular Operator User
  const operatorRole = await prisma.role.findFirst({ where: { name: 'Operator' } });
  await prisma.user.upsert({
    where: { email: 'operator@nexus.ai' },
    update: { password: hashedPassword },
    create: {
      email: 'operator@nexus.ai',
      password: hashedPassword,
      name: 'Standard Operator',
      roleId: operatorRole.id,
      agencyId: nexusAgency.id,
    },
  });

  // 5. Create Demo Profiles for the Agency
  const demoProfiles = [
    { name: 'Diana', status: 'online', phoneNumber: '+1234567890', agencyId: nexusAgency.id, data: JSON.stringify({ age: 24, location: 'London', bio: 'Premium model' }) },
    { name: 'Sophie', status: 'online', phoneNumber: '+1234567891', agencyId: nexusAgency.id, data: JSON.stringify({ age: 22, location: 'Manchester', bio: 'Rising star' }) },
    { name: 'Elena', status: 'offline', phoneNumber: '+1234567892', agencyId: nexusAgency.id, data: JSON.stringify({ age: 26, location: 'Birmingham', bio: 'Sophisticated elegance' }) },
  ];

  for (const profile of demoProfiles) {
    await prisma.profile.upsert({
      where: { id: profile.name.toLowerCase() }, // Simple ID for demo
      update: profile,
      create: { id: profile.name.toLowerCase(), ...profile },
    });
  }

  console.log('Seed finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
