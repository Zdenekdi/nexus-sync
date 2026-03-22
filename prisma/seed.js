const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Agencies
  const agencies = [
    {
      id: 'agency-01',
      name: 'Elite Talent Management',
      region: 'UK/Europe',
      plan: 'Enterprise',
      safetyAlertMode: 'MANAGERS_AND_ASSIGNED',
    },
    {
      id: 'agency-02',
      name: 'Global Diamond Agency',
      region: 'International',
      plan: 'Professional',
      safetyAlertMode: 'MANAGERS_AND_ASSIGNED',
    }
  ];

  for (const agency of agencies) {
    await prisma.agency.upsert({
      where: { id: agency.id },
      update: { safetyAlertMode: agency.safetyAlertMode },
      create: agency,
    });
  }
  console.log('Agencies seeded.');

  // 2. Roles
  const roles = [
    { name: 'System Owner', isSuperAdmin: true, isManager: true, permissions: JSON.stringify({ all: true }), agencyId: null },
    { name: 'Agency Admin', isSuperAdmin: false, isManager: true, permissions: JSON.stringify({ manage: true }), agencyId: 'agency-01' },
    { name: 'Senior Operator', isSuperAdmin: false, isManager: true, permissions: JSON.stringify({ operate: true }), agencyId: 'agency-01' },
    { name: 'Operator', isSuperAdmin: false, isManager: false, permissions: JSON.stringify({ basic: true }), agencyId: 'agency-01' },
    { name: 'Model', isSuperAdmin: false, isManager: false, permissions: JSON.stringify({ view: true }), agencyId: 'agency-01' },
    { name: 'Senior Operator', isSuperAdmin: false, isManager: true, permissions: JSON.stringify({ operate: true }), agencyId: 'agency-02' },
  ];

  for (const role of roles) {
    const existing = await prisma.role.findFirst({
        where: { name: role.name, agencyId: role.agencyId }
    });
    if (existing) {
        await prisma.role.update({
            where: { id: existing.id },
            data: { isManager: role.isManager }
        });
    } else {
        await prisma.role.create({ data: role });
    }
  }
  console.log('Roles seeded.');

  // ... (Users remain similar) ...
  // Get real role IDs
  const dbRoles = await prisma.role.findMany();
  const getRoleId = (name, aId) => dbRoles.find(r => r.name === name && r.agencyId === aId)?.id;

  // 3. Users (Operators)
  const users = [
    { id: 'op-01', email: 'alice@nexus.sync', name: 'Alice M.', password: 'password123', roleName: 'Senior Operator', agencyId: 'agency-01' },
    { id: 'op-02', email: 'mark@nexus.sync', name: 'Mark T.', password: 'password123', roleName: 'Agency Admin', agencyId: 'agency-01' },
    { id: 'op-03', email: 'sarah@nexus.sync', name: 'Sarah K.', password: 'password123', roleName: 'Senior Operator', agencyId: 'agency-02' },
    { id: 'op-06', email: 'admin@nexus.ai', name: 'Super Admin', password: 'password123', roleName: 'System Owner', agencyId: null },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
        await prisma.user.update({
            where: { id: existing.id },
            data: { roleId: getRoleId(user.roleName, user.agencyId) }
        });
    } else {
        await prisma.user.create({
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                password: hashedPassword,
                roleId: getRoleId(user.roleName, user.agencyId),
                agencyId: user.agencyId,
            }
        });
    }
  }
  console.log('Users seeded.');

  // 4. Profiles with Assignments
  const profiles = [
    { id: 'ldn-01', name: 'Diana (Central London)', phoneNumber: '+420 773 227 907', agencyId: 'agency-01', assignedUserIds: ['op-01'] },
    { id: 'manc-05', name: 'Bella (Manchester)', phoneNumber: '+44 7700 900456', agencyId: 'agency-01', assignedUserIds: ['op-01'] },
    { id: 'birm-02', name: 'Chloe (Birmingham)', phoneNumber: '+44 7700 900789', agencyId: 'agency-01', assignedUserIds: ['op-02'] },
    { id: 'nyc-01', name: 'Elena (New York City)', phoneNumber: '+1 212 555 0101', agencyId: 'agency-02', assignedUserIds: ['op-03'] },
  ];

  for (const profile of profiles) {
    const { assignedUserIds, ...profileData } = profile;
    const existing = await prisma.profile.findUnique({ where: { id: profile.id } });
    if (existing) {
        await prisma.profile.update({
            where: { id: profile.id },
            data: {
                assignees: {
                    set: assignedUserIds.map(id => ({ id }))
                }
            }
        });
    } else {
        await prisma.profile.create({
            data: {
                ...profileData,
                assignees: {
                    connect: assignedUserIds.map(id => ({ id }))
                }
            }
        });
    }
  }
  console.log('Profiles and Assignments seeded.');

  // 5. Bookings & Safety Sessions
  const now = new Date();
  const bookings = [
    {
      id: 'book-01',
      profileId: 'ldn-01',
      agencyId: 'agency-01',
      title: 'Private Dinner - Mayfair',
      startTime: new Date(now.getTime() + 3600000), // In 1 hour
      endTime: new Date(now.getTime() + 3600000 * 3), // 2 hours duration
      status: 'scheduled'
    },
    {
      id: 'book-02',
      profileId: 'ldn-01',
      agencyId: 'agency-01',
      title: 'Studio Session',
      startTime: new Date(now.getTime() - 3600000 * 2), // 2 hours ago
      endTime: new Date(now.getTime() - 3600000), // 1 hour ago
      status: 'completed'
    }
  ];

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      update: {},
      create: booking,
    });
  }
  console.log('Bookings seeded.');

  // Create an active safety session for testing
  await prisma.safetySession.upsert({
    where: { id: 'sess-01' },
    update: {},
    create: {
      id: 'sess-01',
      agencyId: 'agency-01',
      profileId: 'ldn-01',
      bookingId: 'book-01',
      state: 'CHECKED_IN',
      plannedEndAt: new Date(now.getTime() + 3600000 * 3),
      graceUntil: new Date(now.getTime() + 3600000 * 3 + 600000), // +10 min grace
    }
  });
  console.log('Safety Sessions seeded.');

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
