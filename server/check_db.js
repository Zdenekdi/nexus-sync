const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({
      include: { role: true }
    });
    console.log('USERS AND ROLES:');
    users.forEach(u => {
      console.log(`- User: ${u.email}, Role: ${u.role?.name}, isAppOwner: ${u.role?.isAppOwner}, isManager: ${u.role?.isManager}`);
    });

    const bookings = await prisma.booking.findMany({ take: 5 });
    console.log('\nBOOKINGS SAMPLE:');
    console.log(JSON.stringify(bookings, null, 2));

    const profilesWithData = await prisma.profile.findMany({
      where: { NOT: { data: '' } },
      take: 5
    });
    console.log('\nPROFILES WITH DATA IN PG:');
    console.log(profilesWithData.length);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
