const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function findUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'dias.zd@gmail.com' },
    include: { role: true }
  });
  console.log('User found:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}
findUser();
