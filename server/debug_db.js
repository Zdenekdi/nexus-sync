const prisma = require('./src/services/db');

async function debugProfiles() {
  try {
    const profiles = await prisma.profile.findMany({
      include: { agency: true }
    });
    console.log(`Total profiles in DB: ${profiles.length}`);
    profiles.forEach(p => {
      console.log(`Profile: ${p.name}, AgencyID: ${p.agencyId}, Agency: ${p.agency?.name || 'NULL'}`);
    });

    const roles = await prisma.role.findMany();
    console.log(`\nTotal roles in DB: ${roles.length}`);
    roles.forEach(r => {
      console.log(`Role: ${r.name}, isManager: ${r.isManager}, isAppOwner: ${r.isAppOwner}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

debugProfiles();
