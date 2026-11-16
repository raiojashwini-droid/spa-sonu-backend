"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoSeedDatabase = autoSeedDatabase;
const database_1 = __importDefault(require("./database"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const logger_1 = require("../utils/logger");
async function autoSeedDatabase() {
    try {
        const userCount = await database_1.default.user.count();
        if (userCount > 0) {
            return; // Database already seeded
        }
        logger_1.logger.info('[AutoSeed] Fresh database detected. Seeding core roles and default accounts...');
        // 1. Roles
        const roles = [
            client_1.RoleName.MANAGER,
            client_1.RoleName.RECEPTION,
            client_1.RoleName.TECHNICIAN,
            client_1.RoleName.CLEANER,
        ];
        const roleMap = {};
        for (const roleName of roles) {
            const role = await database_1.default.role.upsert({
                where: { name: roleName },
                update: {},
                create: { name: roleName },
            });
            roleMap[roleName] = role.id;
        }
        // 2. Default Users (password: 'password')
        const defaultPasswordHash = await bcrypt_1.default.hash('password', 10);
        const seedUsers = [
            {
                email: 'manager@gmail.com',
                role: client_1.RoleName.MANAGER,
                name: 'Manager',
                phone: '+237670000001',
            },
            {
                email: 'reception@gmail.com',
                role: client_1.RoleName.RECEPTION,
                name: 'Reception',
                phone: '+237670000002',
            },
            {
                email: 'amina@gmail.com',
                role: client_1.RoleName.TECHNICIAN,
                name: 'Amina',
                phone: '+237670000003',
                specialties: ['Nails'],
            },
            {
                email: 'bella@gmail.com',
                role: client_1.RoleName.TECHNICIAN,
                name: 'Bella',
                phone: '+237670000005',
                specialties: ['Facial', 'Massage'],
            },
            {
                email: 'cleaner@gmail.com',
                role: client_1.RoleName.CLEANER,
                name: 'Cleaner',
                phone: '+237670000004',
            },
        ];
        for (const u of seedUsers) {
            await database_1.default.user.create({
                data: {
                    email: u.email,
                    passwordHash: defaultPasswordHash,
                    roleId: roleMap[u.role],
                    isActive: true,
                    staffProfile: {
                        create: {
                            name: u.name,
                            phone: u.phone,
                            specialties: u.specialties || null,
                        },
                    },
                },
            });
        }
        // 3. Default Services
        const defaultServices = [
            { name: 'Gel Manicure', category: 'Nails', price: 15000, durationMinutes: 45 },
            { name: 'Spa Pedicure Luxe', category: 'Pedicure', price: 20000, durationMinutes: 60 },
            { name: 'Hydra-Glow Facial', category: 'Facial', price: 35000, durationMinutes: 75 },
            { name: 'Deep Tissue Massage', category: 'Massage', price: 40000, durationMinutes: 60 },
            { name: 'Hot Stone Therapy', category: 'Massage', price: 50000, durationMinutes: 90 },
        ];
        for (const s of defaultServices) {
            await database_1.default.service.create({
                data: {
                    name: s.name,
                    category: s.category,
                    price: s.price,
                    durationMinutes: s.durationMinutes,
                    status: client_1.ServiceStatus.ACTIVE,
                },
            });
        }
        logger_1.logger.info('[AutoSeed] Database initialized with default roles, users, and services.');
    }
    catch (err) {
        logger_1.logger.warn('[AutoSeed] Notice during auto-seed check:', { error: err?.message || String(err) });
    }
}
//# sourceMappingURL=autoSeed.js.map