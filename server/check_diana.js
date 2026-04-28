
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profile.findMany({
    where: {
      name: {
        contains: 'Diana',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      name: true,
      relayOnline: true,
      lastSync: true
    }
  });
  console.log(JSON.stringify(profiles, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
