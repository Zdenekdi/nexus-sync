const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agencies = await prisma.agency.findMany();
  console.log(JSON.stringify(agencies, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
