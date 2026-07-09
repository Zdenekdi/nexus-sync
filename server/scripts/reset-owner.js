const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
  const email = process.env.OWNER_EMAIL;
  const newPassword = process.env.OWNER_PASSWORD;

  if (!email || !newPassword) {
    console.error('Usage: OWNER_EMAIL="owner@example.com" OWNER_PASSWORD="..." node server/scripts/reset-owner.js');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log(`Resetting password for: ${email}...`);

  try {
    // 1. Ensure "App Owner" role exists
    let role = await prisma.role.findFirst({
      where: { name: 'App Owner' }
    });

    if (!role) {
      console.log('Creating "App Owner" role...');
      role = await prisma.role.create({
        data: {
          name: 'App Owner',
          isAppOwner: true,
          permissions: '*'
        }
      });
    }

    // 2. Upsert the user
    const user = await prisma.user.upsert({
      where: { email },
      update: { 
        password: hashedPassword,
        roleId: role.id
      },
      create: {
        email,
        name: 'Zdenek Dias',
        password: hashedPassword,
        roleId: role.id
      }
    });

    console.log('-----------------------------------');
    console.log(`SUCCESS: Password reset for ${email}`);
    console.log('-----------------------------------');
    console.log('You can now log in with the password supplied via OWNER_PASSWORD.');

  } catch (error) {
    console.error('ERROR during password reset:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
