import prisma from '../config/database';
import { logger } from '../utils/logger';

async function testConnection() {
  try {
    logger.info('Testing database connection with Prisma...');

    // 1. Verify raw connection
    await prisma.$queryRaw`SELECT 1 as result`;
    logger.info('Database connection verified: MySQL connection is active.');

    // 2. Verify models and query seeded roles
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
    });

    logger.info(`Core roles count: ${roles.length}`);
    roles.forEach((r) => {
      logger.info(`  - Role: ${r.name} (id: ${r.id})`);
    });

    console.log('\n[PASS] Database Connection & Core Identity Query Successful!\n');
  } catch (error) {
    logger.error('Database connection test failed', { error: String(error) });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
