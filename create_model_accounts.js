const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profile.findMany({
    include: { agency: true }
  });

  const hashedPwd = await bcrypt.hash('password123', 10);

  console.log('--- STARTING MODEL ACCOUNT CREATION & CLEANUP ---');

  for (const profile of profiles) {
    let profileName = profile.name;

    // 0. Renaming Diana (Special Request)
    if (profileName.includes('Sophie') && profileName.includes('London')) {
      console.log(`- Renaming ${profileName} -> Diana (Central London)`);
      profileName = 'Diana (Central London)';
      await prisma.profile.update({
        where: { id: profile.id },
        data: { name: profileName }
      });
    }

    // Generate email based on first name
    const firstName = profileName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${firstName}@nexus.sync`;

    console.log(`\nProfile: ${profileName}`);
    console.log(`Email: ${email}`);

    // 1. Ensure "Model" role exists for this agency
    let role = await prisma.role.findFirst({
      where: { agencyId: profile.agencyId, name: 'Model' }
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: 'Model',
          description: 'Standard model access',
          permissions: 'messaging,profiles',
          isAppOwner: false,
          isManager: false,
          agencyId: profile.agencyId
        }
      });
      console.log(`- Created 'Model' role for agency: ${profile.agency.name}`);
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log(`- User ${email} already exists, skipping.`);
      continue;
    }

    // 3. Create user
    await prisma.user.create({
      data: {
        email,
        password: hashedPwd,
        name: profileName.split(' (')[0], // "Diana (Central London)" -> "Diana"
        roleId: role.id,
        agencyId: profile.agencyId
      }
    });

    console.log(`- SUCCESS: Created user account.`);
  }

  console.log('\n--- FINISHED ---');
}

main()
  .catch(e => {
    console.error('\n--- ERROR ---');
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
