const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function listUsers() {
  const users = await prisma.user.findMany({
    include: { role: true }
  });
  console.log('--- ALL USERS ---');
  users.forEach(u => {
    console.log(`- ${u.email} (Role: ${u.role?.name || 'none'})`);
  });
  console.log('-----------------');
  await prisma.$disconnect();
}
listUsers();
