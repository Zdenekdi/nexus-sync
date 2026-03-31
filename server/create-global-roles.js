const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Global Role Templates...');

    const globalTemplates = [
        {
            name: 'Agency Admin',
            isAppOwner: false,
            isManager: true,
            agencyId: null,
            permissions: JSON.stringify({
                permissions: true, hierarchy: true, analytics: true, 
                messaging: true, calendar: true, profiles: true, 
                web_profiles: true, device_setup: true, audit_logs: true, 
                qa_hub: true, settings: true, inventory: false
            })
        },
        {
            name: 'Senior Operator',
            isAppOwner: false,
            isManager: true,
            agencyId: null,
            permissions: JSON.stringify({
                messaging: true, calendar: true, profiles: true, 
                device_setup: true, settings: true, qa_hub: true, 
                analytics: true, inventory: false
            })
        },
        {
            name: 'Operator',
            isAppOwner: false,
            isManager: false,
            agencyId: null,
            permissions: JSON.stringify({
                messaging: true, calendar: true, profiles: true, 
                device_setup: true, settings: true, inventory: false
            })
        },
        {
            name: 'Model',
            isAppOwner: false,
            isManager: false,
            agencyId: null,
            permissions: JSON.stringify({
                messaging: true, calendar: true, inventory: false
            })
        }
    ];

    for (const template of globalTemplates) {
        const existing = await prisma.role.findFirst({
            where: { name: template.name, agencyId: null }
        });

        if (existing) {
            console.log(`Global template '${template.name}' already exists. Updating permissions...`);
            await prisma.role.update({
                where: { id: existing.id },
                data: { permissions: template.permissions }
            });
        } else {
            console.log(`Creating global template '${template.name}'...`);
            await prisma.role.create({ data: template });
        }
    }

    console.log('Global Role Templates successfully seeded.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
