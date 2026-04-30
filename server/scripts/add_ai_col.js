const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to add aiInstructions column to Agency table...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "aiInstructions" TEXT;`);
    console.log('Success! Column added or already exists.');
  } catch (error) {
    console.error('Failed to add column:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
