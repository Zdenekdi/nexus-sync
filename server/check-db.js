const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const users = await prisma.user.findMany({
      include: { role: true, assignedProfiles: true }
    });
    console.log('--- USERS ---');
    users.forEach(u => {
      console.log(`User: ${u.name} (${u.email}) | Role: ${u.role?.name} | Agency: ${u.agencyId} | Assigned: ${u.assignedProfiles.length} profiles`);
    });

    const profiles = await prisma.profile.findMany({
      include: { assignees: true }
    });
    console.log('\n--- PROFILES ---');
    profiles.forEach(p => {
      console.log(`Profile: ${p.name} | Agency: ${p.agencyId} | Assignees: ${p.assignees.map(a => a.name).join(', ')}`);
    });

    const roles = await prisma.role.findMany();
    console.log('\n--- ROLES ---');
    roles.forEach(r => {
      console.log(`Role: ${r.name} | Agency: ${r.agencyId}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
