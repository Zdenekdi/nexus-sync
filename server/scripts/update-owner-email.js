// scripts/update-owner-email.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ownerEmail = 'dias.zd@gmail.com';
  const mockEmail = 'owner@nexus.sync';

  console.log(`🔄 Fixing App Owner and Senior Operator roles...`);

  try {
    // 1. Ensure App Owner email is correct (back to real one for now so tests pass)
    await prisma.user.updateMany({
      where: { OR: [{ email: ownerEmail }, { email: mockEmail }] },
      data: { email: ownerEmail },
    });
    console.log('✅ App Owner email set to:', ownerEmail);

    // 2. Fix Alice's role
    const seniorRole = await prisma.role.findFirst({ where: { name: 'Senior Operator' } });
    if (seniorRole) {
      await prisma.user.update({
        where: { email: 'alice@nexus.sync' },
        data: { roleId: seniorRole.id },
      });
      console.log('✅ Alice (alice@nexus.sync) role fixed to Senior Operator');
    } else {
      console.error('❌ Role "Senior Operator" not found in DB!');
    }

  } catch (error) {
    console.error('❌ Failed to update DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
