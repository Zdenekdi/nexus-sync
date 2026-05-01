/**
 * One-time cleanup script: deletes any global Role that does NOT
 * have one of the 6 canonical system IDs, then reassigns affected
 * users to the correct system role.
 *
 * Run with:  node server/scripts/cleanup_ghost_roles.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SYSTEM_IDS = [
    'global-app-owner',
    'global-agency-admin',
    'global-manager',
    'global-senior-operator',
    'global-operator',
    'global-model',
];

async function run() {
    console.log('=== Ghost Role Cleanup ===\n');

    // 1. Find ALL roles that look global (agencyId null OR empty string)
    //    but are NOT one of the 6 canonical IDs.
    const ghosts = await prisma.role.findMany({
        where: {
            OR: [{ agencyId: null }, { agencyId: '' }],
            id: { notIn: SYSTEM_IDS },
        },
    });

    if (ghosts.length === 0) {
        console.log('✅ No ghost roles found. Database is clean.');
        await prisma.$disconnect();
        return;
    }

    console.log(`Found ${ghosts.length} ghost role(s):`);
    for (const g of ghosts) {
        console.log(`  - "${g.name}" (ID: ${g.id}, agencyId: ${JSON.stringify(g.agencyId)})`);
    }
    console.log('');

    // 2. For each ghost, reassign users and delete.
    for (const g of ghosts) {
        const norm = g.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Find the best matching system role by name slug
        const targetId = SYSTEM_IDS.find(id => {
            const idNorm = id.replace('global-', '').replace(/-/g, ' ');
            return idNorm === norm || norm.includes(idNorm) || idNorm.includes(norm);
        }) || 'global-operator';

        const affected = await prisma.user.count({ where: { roleId: g.id } });
        if (affected > 0) {
            await prisma.user.updateMany({ where: { roleId: g.id }, data: { roleId: targetId } });
            console.log(`  ↳ Reassigned ${affected} user(s) from "${g.name}" → ${targetId}`);
        }

        try {
            await prisma.role.delete({ where: { id: g.id } });
            console.log(`  ✅ Deleted ghost role "${g.name}" (${g.id})`);
        } catch (err) {
            console.error(`  ❌ Failed to delete "${g.name}" (${g.id}): ${err.message}`);
        }
    }

    // 3. Final verification
    console.log('\n=== Final state of global roles ===');
    const final = await prisma.role.findMany({
        where: { agencyId: null },
        orderBy: { createdAt: 'asc' },
    });
    final.forEach(r => console.log(`  - "${r.name}" (ID: ${r.id})`));

    await prisma.$disconnect();
    console.log('\nDone.');
}

run().catch(async err => {
    console.error('Script failed:', err);
    await prisma.$disconnect();
    process.exit(1);
});
