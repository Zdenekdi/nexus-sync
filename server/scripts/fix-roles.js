const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRoles() {
    console.log('--- Database Role Normalization ---');
    
    const roleMapping = {
        'SENIOR OPERÁTOR': 'Senior Operator',
        'SENIOR OPERATOR': 'Senior Operator',
        'MANAŽER': 'Manager',
        'ADMINISTRÁTOR': 'Agency Admin',
        'MAJITEL AGENTURY': 'Agency Admin',
        'MODELKA': 'Model',
        'OPERÁTOR': 'Operator'
    };

    const roles = await prisma.role.findMany();
    console.log(`Found ${roles.length} roles.`);

    for (const role of roles) {
        const upperName = role.name.toUpperCase().trim();
        const newName = roleMapping[upperName];
        
        if (newName && newName !== role.name) {
            console.log(`Renaming role: "${role.name}" -> "${newName}" (Agency: ${role.agencyId || 'Global'})`);
            await prisma.role.update({
                where: { id: role.id },
                data: { name: newName }
            });
        }
    }

    console.log('--- Done ---');
}

fixRoles()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
