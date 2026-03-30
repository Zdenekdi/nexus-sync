const prisma = require('./services/db');

async function test() {
  try {
    const roleCount = await prisma.role.count();
    const agencyCount = await prisma.agency.count();
    const appOwner = await prisma.user.findFirst({
        where: { role: { isAppOwner: true } },
        include: { role: true }
    });

    console.log('--- DB STATE ---');
    console.log('Agencies:', agencyCount);
    console.log('Roles:', roleCount);
    console.log('App Owner User found:', !!appOwner);
    if (appOwner) {
        console.log('App Owner Role Name:', appOwner.role.name);
        console.log('App Owner Role isAppOwner flag:', appOwner.role.isAppOwner);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

test();
