const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listRoles() {
    try {
        const roles = await prisma.role.findMany({
            where: { agencyId: null },
            orderBy: { createdAt: 'asc' }
        });
        
        console.log(`Celkem nalezeno ${roles.length} globálních úrovní (rolí):`);
        roles.forEach(r => {
            console.log(`- ${r.name} (ID: ${r.id}, isManager: ${r.isManager}, isAppOwner: ${r.isAppOwner})`);
        });
    } catch (err) {
        console.error('Chyba při čtení DB:', err);
    } finally {
        await prisma.$disconnect();
    }
}

listRoles();
