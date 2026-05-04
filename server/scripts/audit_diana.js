
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://nexus:nexus_prod_2024!@78.141.202.139:5432/nexus_prod"
    }
  }
});

async function main() {
  console.log('--- AUDIT DIANA ---');
  
  // 1. Find Profile
  const profile = await prisma.profile.findFirst({
    where: {
      name: { contains: 'Diana', mode: 'insensitive' }
    }
  });

  if (!profile) {
    console.log('Profile "Diana" NOT FOUND');
    return;
  }

  console.log(`Found Profile: ${profile.name} (ID: ${profile.id})`);
  console.log(`Phone: ${profile.phoneNumber}`);
  console.log(`Status: ${profile.status}`);

  // 2. Find Chats
  const chats = await prisma.chat.findMany({
    where: { profileId: profile.id },
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  console.log(`\nFound ${chats.length} chats for Diana.`);
  
  for (const chat of chats) {
    console.log(`- Chat ID: ${chat.id} (External: ${chat.externalId})`);
    console.log(`  Messages: ${chat._count.messages}`);
    if (chat.messages[0]) {
      console.log(`  Last Message: "${chat.messages[0].text.substring(0, 50)}..." at ${chat.messages[0].createdAt}`);
    }
  }

  if (chats.length > 0) {
    const selectedChat = chats[0];
    const messages = await prisma.message.findMany({
      where: { chatId: selectedChat.id },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    console.log(`\nRecent history for Chat ${selectedChat.id}:`);
    for (const msg of messages) {
      console.log(`[${msg.createdAt.toISOString()}] ${msg.direction}: ${msg.text}`);
    }
  }
}

main()
  .catch(e => {
    console.error('Audit failed:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
