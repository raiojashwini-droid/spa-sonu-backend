"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function run() {
    const users = await prisma.user.findMany({
        where: { role: 'MARKETER' },
        include: { staffProfile: true },
    });
    console.log('MARKETER USERS:', JSON.stringify(users, null, 2));
    const clients = await prisma.client.findMany({
        where: {
            OR: [
                { name: { contains: 'marketer' } },
                { introducedByEmployeeId: { not: null } },
            ],
        },
        include: {
            invoices: true,
            introducedByEmployee: { select: { id: true, email: true, name: true } },
        },
    });
    console.log('REFERRED CLIENTS & INVOICES:', JSON.stringify(clients, null, 2));
}
run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=checkMarketer.js.map