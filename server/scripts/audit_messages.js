const { PrismaClient } = require('@prisma/client');

async function main() {
  const remoteUrl = 'postgresql://nexus:nexus_prod_2024!@78.141.202.139:5432/nexus_prod';
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: remoteUrl,
      },
    },
  });

  try {
    console.log('--- AUDIT DIANA (remote server) ---');
    
    // 1. Najít profil Diana
    const profiles = await prisma.profile.findMany({
      where: {
        name: { contains: 'Diana', mode: 'insensitive' }
      },
      include: {
        agency: true
      }
    });

    if (profiles.length === 0) {
      console.log('Profil "Diana" nenalezen.');
      return;
    }

    for (const profile of profiles) {
      console.log(`\nProfil: ${profile.name} (ID: ${profile.id})`);
      console.log(`Agentura: ${profile.agency.name} (ID: ${profile.agencyId})`);

      // 2. Najít chaty pro tento profil
      const chats = await prisma.chat.findMany({
        where: { profileId: profile.id },
        include: {
          client: true,
          _count: { select: { messages: true } }
        }
      });

      console.log(`Počet chatů: ${chats.length}`);

      for (const chat of chats) {
        console.log(`\n  Chat ID: ${chat.id} (External ID: ${chat.externalId})`);
        console.log(`  Klient: ${chat.client?.name || 'Neznámý'} (${chat.client?.phone || 'Bez čísla'})`);
        console.log(`  Počet zpráv: ${chat._count.messages}`);

        // 3. Vytáhnout posledních 10 zpráv pro audit
        const messages = await prisma.message.findMany({
          where: { chatId: chat.id },
          orderBy: { createdAt: 'asc' },
          take: 50
        });

        messages.forEach(msg => {
          const date = msg.createdAt.toISOString().replace('T', ' ').substring(0, 19);
          console.log(`    [${date}] ${msg.direction === 'inbound' ? 'KLI' : 'MOD'}: ${msg.text}`);
        });
      }
    }

  } catch (err) {
    console.error('CHYBA PŘI AUDITU:', err.message);
    if (err.message.includes('Can\'t reach database server')) {
      console.log('\nPOZNÁMKA: Databáze na 78.141.202.139 je pravděpodobně chráněna firewallem.');
      console.log('Tento skript by měl být spuštěn přímo na VPS nebo přes SSH tunel.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
