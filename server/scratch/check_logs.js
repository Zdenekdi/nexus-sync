const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogs() {
  try {
    const latestLogs = await prisma.message.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    console.log(JSON.stringify(latestLogs, null, 2));
  } catch (error) {
    console.error('Error fetching logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogs();
