// scripts/update-owner-email.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL;
  const previousEmail = process.env.PREVIOUS_OWNER_EMAIL || 'owner@example.test';
  const seniorOperatorEmail = process.env.SENIOR_OPERATOR_EMAIL;

  if (!ownerEmail) {
    console.error('Usage: OWNER_EMAIL="owner@example.com" [PREVIOUS_OWNER_EMAIL="old@example.com"] [SENIOR_OPERATOR_EMAIL="senior@example.com"] node server/scripts/update-owner-email.js');
    process.exit(1);
  }

  console.log(`🔄 Fixing App Owner and Senior Operator roles...`);

  try {
    // 1. Ensure App Owner email is correct.
    await prisma.user.updateMany({
      where: { OR: [{ email: ownerEmail }, { email: previousEmail }] },
      data: { email: ownerEmail },
    });
    console.log('✅ App Owner email set to:', ownerEmail);

    // 2. Optionally fix a senior operator role.
    if (seniorOperatorEmail) {
      const seniorRole = await prisma.role.findFirst({ where: { name: 'Senior Operator' } });
      if (seniorRole) {
        await prisma.user.update({
          where: { email: seniorOperatorEmail },
          data: { roleId: seniorRole.id },
        });
        console.log('✅ Senior operator role fixed for:', seniorOperatorEmail);
      } else {
        console.error('❌ Role "Senior Operator" not found in DB!');
      }
    }

  } catch (error) {
    console.error('❌ Failed to update DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
