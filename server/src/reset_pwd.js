const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
  const email = 'dias.zd@gmail.com';
  const newPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  console.log(`HESLO RESETOVANO: ${email} má nyní heslo: admin123`);
  process.exit(0);
}

reset().catch(err => {
  console.error(err);
  process.exit(1);
});
