const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'dias.zd@gmail.com' },
    include: { role: true }
  });
  console.log('User found:', JSON.stringify(user, null, 2));
  
  const bindings = await prisma.deviceBinding.findMany({
    include: { profile: true }
  });
  console.log('Total bindings in DB:', bindings.length);
  bindings.forEach(b => {
    console.log(`- InstallationID: ${b.installationId}, Active: ${b.active}, UserID: ${b.userId}, AgencyID: ${b.agencyId}, LastSeen: ${b.lastSeenAt}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
