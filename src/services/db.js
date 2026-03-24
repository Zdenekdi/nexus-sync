const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 100) { // Log queries slower than 100ms
    console.warn(`[Prisma] Slow Query (${e.duration}ms): ${e.query}`);
  }
});

module.exports = prisma;
