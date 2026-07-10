const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING ROLE CLEANUP & USER CREATION ---');

  try {
    // 1. Get all roles to analyze
    const allRoles = await prisma.role.findMany();
    console.log(`Found ${allRoles.length} roles in total.`);

    // 2. Define canonical roles mapping
    // We want to keep 'global-' roles if they exist, otherwise we'll pick one and delete others
    const canonicalRoles = {}; // { 'RoleName': 'CanonicalID' }
    const rolesToDelete = [];

    const roleNames = [...new Set(allRoles.map(r => r.name))];
    
    for (const name of roleNames) {
      const variants = allRoles.filter(r => r.name === name);
      // Prefer global- version
      let canonical = variants.find(r => r.id.startsWith('global-')) || variants[0];
      canonicalRoles[name] = canonical.id;
      
      variants.forEach(v => {
        if (v.id !== canonical.id) rolesToDelete.push(v.id);
      });
      
      console.log(`Canonical for "${name}" set to ID: ${canonical.id}`);

      // SPECIAL: Ensure Manager role has full permissions as per screenshot
      if (name === 'Manager' || name === 'Agency Admin') {
        const perms = {
          agency_hierarchy: true,
          agency_analytics: true,
          agency_settings: true,
          ops_messages: true,
          ops_calendar: true,
          ops_profiles: true,
          ops_web_profiles: true,
          ops_devices: true,
          ops_qa: true,
          ops_recommendations: true,
          infra_agencies: name === 'Agency Admin',
          infra_permissions: false
        };
        await prisma.role.update({
          where: { id: canonical.id },
          data: { 
            permissions: JSON.stringify(perms),
            isManager: true 
          }
        });
        console.log(`- Updated permissions for ${name} (${canonical.id})`);
      }
    }

    // 3. Migrate users to canonical roles
    console.log('\nMigrating users to canonical roles...');
    const users = await prisma.user.findMany({ include: { role: true } });
    
    for (const user of users) {
      const canonicalId = canonicalRoles[user.role.name];
      if (canonicalId && user.roleId !== canonicalId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: canonicalId }
        });
        console.log(`- Updated ${user.email}: ${user.role.name} (${user.roleId}) -> (${canonicalId})`);
      }
    }

    // 4. Delete duplicate roles
    console.log(`\nDeleting ${rolesToDelete.length} duplicate roles...`);
    for (const id of rolesToDelete) {
      try {
        await prisma.role.delete({ where: { id } });
        console.log(`- Deleted role ID: ${id}`);
      } catch (e) {
        console.error(`- Failed to delete role ID: ${id} (likely still has users/relations)`);
      }
    }

    // 5. Create the new Manager for agency-01
    const managerEmail = 'manager@nexus.sync';
    const existingManager = await prisma.user.findUnique({ where: { email: managerEmail } });
    
    if (!existingManager) {
      const managerRoleId = canonicalRoles['Manager'];
      if (!managerRoleId) {
        console.error('CRITICAL: Manager role not found! Cannot create user.');
      } else {
        const managerPassword = process.env.MANAGER_PASSWORD;
        if (!managerPassword) {
          throw new Error('MANAGER_PASSWORD is required to create manager@nexus.sync');
        }
        const hashedPassword = await bcrypt.hash(managerPassword, 10);
        await prisma.user.create({
          data: {
            email: managerEmail,
            name: 'Agency Manager',
            password: hashedPassword,
            roleId: managerRoleId,
            agencyId: 'agency-01'
          }
        });
        console.log(`\nSUCCESS: Created new Manager for agency-01: ${managerEmail}`);
      }
    } else {
      console.log(`\nUser ${managerEmail} already exists.`);
      // Ensure they have the correct role and agency
      await prisma.user.update({
        where: { email: managerEmail },
        data: { 
          roleId: canonicalRoles['Manager'],
          agencyId: 'agency-01'
        }
      });
      console.log(`- Updated ${managerEmail} to ensure correct Role and Agency.`);
    }

    console.log('\n--- CLEANUP COMPLETE ---');

  } catch (err) {
    console.error('\nFATAL ERROR:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
