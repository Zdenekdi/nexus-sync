const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAssignments() {
  try {
    const alice = await prisma.user.findUnique({
      where: { email: 'alice@nexus.sync' },
      include: { assignedProfiles: true }
    });

    console.log('--- Alice M. ---');
    if (!alice) {
      console.log('Alice not found!');
    } else {
      console.log(`ID: ${alice.id}`);
      console.log(`Role: ${alice.roleId}`);
      console.log(`Assigned Profiles Count: ${alice.assignedProfiles.length}`);
      alice.assignedProfiles.forEach(p => {
        console.log(` - Profile: ${p.name} (ID: ${p.id})`);
      });
    }

    const allProfiles = await prisma.profile.findMany({
      include: { assignees: true }
    });

    console.log('\n--- All Profiles ---');
    allProfiles.forEach(p => {
      console.log(`Profile: ${p.name} (ID: ${p.id})`);
      console.log(`  Assignees: ${p.assignees.map(a => a.email).join(', ') || 'NONE'}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAssignments();
