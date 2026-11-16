"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
async function testConnection() {
    try {
        logger_1.logger.info('Testing database connection with Prisma...');
        // 1. Verify raw connection
        await database_1.default.$queryRaw `SELECT 1 as result`;
        logger_1.logger.info('Database connection verified: MySQL connection is active.');
        // 2. Verify models and query seeded roles
        const roles = await database_1.default.role.findMany({
            orderBy: { createdAt: 'asc' },
        });
        logger_1.logger.info(`Core roles count: ${roles.length}`);
        roles.forEach((r) => {
            logger_1.logger.info(`  - Role: ${r.name} (id: ${r.id})`);
        });
        console.log('\n[PASS] Database Connection & Core Identity Query Successful!\n');
    }
    catch (error) {
        logger_1.logger.error('Database connection test failed', { error: String(error) });
        process.exit(1);
    }
    finally {
        await database_1.default.$disconnect();
    }
}
testConnection();
//# sourceMappingURL=testConnection.js.map