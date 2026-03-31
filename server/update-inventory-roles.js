const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching all Agency Admin roles...');
    const roles = await prisma.role.findMany({
        where: { name: 'Agency Admin' }
    });
    
    let updated = 0;
    for (const role of roles) {
        if (!role.permissions) continue;
        
        let perms = {};
        if (typeof role.permissions === 'string') {
            try {
                perms = JSON.parse(role.permissions);
            } catch (e) {
                console.log(`Skipping invalid JSON for role ${role.id}:`, role.permissions);
                continue;
            }
        } else {
            perms = role.permissions;
        }
        
        if (perms.inventory === true) {
            perms.inventory = false;
            await prisma.role.update({
                where: { id: role.id },
                data: { permissions: JSON.stringify(perms) }
            });
            updated++;
            console.log(`Updated inventory to false for role ${role.id}`);
        }
    }
    console.log(`Update complete. Modified ${updated} roles.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
