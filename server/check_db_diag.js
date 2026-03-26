const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DB Check ---');
  try {
    const totalMessages = await prisma.message.count();
    console.log('Total messages:', totalMessages);

    const aliceMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: 'op-01' },
          { text: { contains: '147' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('Alice messages found:', aliceMessages.length);
    aliceMessages.forEach(m => {
      console.log(`[${m.createdAt}] ${m.direction}: ${m.text} (Status: ${m.status})`);
    });

    const recent = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('Most recent messages:');
    recent.forEach(m => {
      console.log(`[${m.createdAt}] ${m.direction}: ${m.text}`);
    });

  } catch (e) {
    console.error('Error querying DB:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
