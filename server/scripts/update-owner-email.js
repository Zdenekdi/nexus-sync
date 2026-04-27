// scripts/update-owner-email.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldEmail = 'dias.zd@gmail.com';
  const newEmail = 'owner@nexus.sync';

  console.log(`🔄 Updating App Owner email from ${oldEmail} to ${newEmail}...`);

  try {
    const user = await prisma.user.update({
      where: { email: oldEmail },
      data: { email: newEmail },
    });
    console.log('✅ Email updated successfully:', user);
  } catch (error) {
    if (error.code === 'P2025') {
      console.warn(`⚠️ User with email ${oldEmail} not found. Check if it was already updated.`);
    } else {
      console.error('❌ Failed to update email:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
