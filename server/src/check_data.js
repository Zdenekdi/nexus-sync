const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Alice' } }
  });
  console.log('--- USERS ---');
  console.log(JSON.stringify(users, null, 2));

  const agencies = await prisma.agency.findMany();
  console.log('\n--- AGENCIES ---');
  console.log(JSON.stringify(agencies, null, 2));

  const profiles = await prisma.profile.findMany();
  console.log('\n--- PROFILES ---');
  console.log(JSON.stringify(profiles, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
