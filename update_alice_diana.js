const prisma = require('./src/services/db');

async function main() {
  const alice = await prisma.user.findFirst({ where: { name: { contains: 'Alice' } } });
  const sophie = await prisma.profile.findFirst({ where: { name: { contains: 'Sophie' } } });

  if (!alice) {
    console.error('Alice not found');
  } else {
    console.log('Found Alice:', alice.id, alice.name);
  }

  if (!sophie) {
    console.error('Sophie not found');
    const diana = await prisma.profile.findFirst({ where: { name: { contains: 'Diana' } } });
    if (diana && alice) {
        await prisma.user.update({
            where: { id: alice.id },
            data: { assignedProfiles: { connect: { id: diana.id } } }
        });
        console.log('Assigned Diana to Alice');
    }
  } else {
    // Rename Sophie to Diana and assign to Alice
    await prisma.profile.update({
      where: { id: sophie.id },
      data: { name: 'Diana' }
    });
    console.log('Renamed Sophie to Diana');

    if (alice) {
        await prisma.user.update({
            where: { id: alice.id },
            data: { assignedProfiles: { connect: { id: sophie.id } } }
        });
        console.log('Assigned Diana (was Sophie) to Alice');
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
