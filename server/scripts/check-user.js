const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const email = process.env.USER_EMAIL;

  if (!email) {
    console.error('Usage: USER_EMAIL="user@example.com" node server/scripts/check-user.js');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });

  if (user) {
    console.log('USER_FOUND:');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role.name}`);
    console.log(`IsAppOwner: ${user.role.isAppOwner}`);
    console.log(`AgencyId: ${user.agencyId}`);
  } else {
    console.log('USER_NOT_FOUND');
  }
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
