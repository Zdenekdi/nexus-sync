const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.message.findMany({
    where: {
      content: { contains: 'Test 333' }
    }
  });
  console.log("Messages found:", messages.length);
  console.log(messages);
  
  // also try sms model if message model doesn't exist
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
