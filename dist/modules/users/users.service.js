"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersService = exports.UsersService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class UsersService {
    formatUser(user) {
        let roleName = user.role?.name || 'TECHNICIAN';
        const email = user.email || '';
        const phone = user.phone || user.staffProfile?.phone || null;
        const username = email.split('@')[0];
        let specialties = [];
        if (user.staffProfile?.specialties) {
            if (Array.isArray(user.staffProfile.specialties)) {
                specialties = user.staffProfile.specialties;
            }
            else if (typeof user.staffProfile.specialties === 'string') {
                try {
                    specialties = JSON.parse(user.staffProfile.specialties);
                }
                catch {
                    specialties = [];
                }
            }
            specialties = specialties.map((s) => (s === 'Massage' ? 'Body Massage' : s));
        }
        if (roleName === 'MARKETER' || specialties.some((s) => s.toLowerCase() === 'marketer')) {
            roleName = 'MARKETER';
            specialties = specialties.filter((s) => s.toLowerCase() !== 'marketer');
        }
        let salaryContract;
        if (user.staffProfile) {
            salaryContract = {
                monthlyTarget: Number(user.staffProfile.monthlyTarget || 0),
                basePay: Number(user.staffProfile.basePay || 0),
                commissionRate: Number(user.staffProfile.commissionRate || 0),
                fixedSalary: Number(user.staffProfile.fixedSalary || 0),
                targetScope: user.staffProfile.targetScope || 'INDIVIDUAL',
            };
        }
        return {
            id: user.id,
            name: user.staffProfile?.name || email.split('@')[0],
            email: email,
            phone: phone,
            username: username,
            role: roleName.toLowerCase(),
            specialties: specialties,
            active: user.isActive,
            salaryContract,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
    async getUsers() {
        const users = await database_1.default.user.findMany({
            include: {
                role: true,
                staffProfile: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        return users.map((u) => this.formatUser(u));
    }
    async getUserById(id) {
        const user = await database_1.default.user.findUnique({
            where: { id },
            include: {
                role: true,
                staffProfile: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return this.formatUser(user);
    }
    async createUser(input) {
        const emailNormalized = (input.email || '').trim().toLowerCase();
        if (!emailNormalized) {
            throw new errorHandler_1.AppError('Email address is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const rawPhone = input.phone && input.phone.trim() ? input.phone.trim() : null;
        const phoneClean = rawPhone ? rawPhone.replace(/\s+/g, '') : null;
        // Check if user already exists with this email
        const existingEmail = await database_1.default.user.findUnique({
            where: { email: emailNormalized },
        });
        if (existingEmail) {
            throw new errorHandler_1.AppError('A user with this email address already exists', constants_1.HTTP_STATUS.CONFLICT);
        }
        // Check if user already exists with this phone (if provided)
        if (rawPhone) {
            const existingPhone = await database_1.default.user.findFirst({
                where: {
                    OR: [
                        { phone: rawPhone },
                        ...(phoneClean && phoneClean !== rawPhone ? [{ phone: phoneClean }] : []),
                        { staffProfile: { phone: rawPhone } },
                        ...(phoneClean && phoneClean !== rawPhone ? [{ staffProfile: { phone: phoneClean } }] : []),
                    ],
                },
            });
            if (existingPhone) {
                throw new errorHandler_1.AppError('A staff member with this phone number already exists', constants_1.HTTP_STATUS.CONFLICT);
            }
        }
        const roleUpper = input.role.toUpperCase();
        let roleRecord = await database_1.default.role.findFirst({
            where: { name: roleUpper },
        });
        if (!roleRecord && roleUpper === 'MARKETER') {
            try {
                roleRecord = await database_1.default.role.upsert({
                    where: { name: 'MARKETER' },
                    update: {},
                    create: { name: 'MARKETER' },
                });
            }
            catch {
                roleRecord = await database_1.default.role.findFirst({
                    where: { name: 'TECHNICIAN' },
                });
            }
        }
        if (!roleRecord) {
            throw new errorHandler_1.AppError(`Invalid role: ${input.role}`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (!input.password || !input.password.trim()) {
            throw new errorHandler_1.AppError('Password is required (minimum 6 characters)', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const passwordToHash = input.password.trim();
        const passwordHash = await bcrypt_1.default.hash(passwordToHash, 10);
        const isMarketerRole = input.role.toLowerCase() === 'marketer';
        const rawSpecs = Array.isArray(input.specialties) ? input.specialties : [];
        const specialtiesList = isMarketerRole && !rawSpecs.includes('Marketer')
            ? [...rawSpecs, 'Marketer']
            : rawSpecs;
        const specialtiesJson = specialtiesList.map((s) => (s === 'Massage' ? 'Body Massage' : s));
        const user = await database_1.default.user.create({
            data: {
                email: emailNormalized,
                phone: rawPhone,
                passwordHash,
                roleId: roleRecord.id,
                isActive: true,
                staffProfile: {
                    create: {
                        name: input.name.trim(),
                        phone: rawPhone,
                        specialties: specialtiesJson,
                    },
                },
            },
            include: {
                role: true,
                staffProfile: true,
            },
        });
        return this.formatUser(user);
    }
    async updateUser(id, input) {
        const existing = await database_1.default.user.findUnique({
            where: { id },
            include: {
                role: true,
                staffProfile: true,
            },
        });
        if (!existing) {
            throw new errorHandler_1.AppError('User not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const userUpdates = {};
        if (input.role) {
            const roleUpper = input.role.toUpperCase();
            let roleRecord = await database_1.default.role.findFirst({
                where: { name: roleUpper },
            });
            if (!roleRecord && roleUpper === 'MARKETER') {
                try {
                    roleRecord = await database_1.default.role.upsert({
                        where: { name: 'MARKETER' },
                        update: {},
                        create: { name: 'MARKETER' },
                    });
                }
                catch {
                    roleRecord = await database_1.default.role.findFirst({
                        where: { name: 'TECHNICIAN' },
                    });
                }
            }
            if (!roleRecord) {
                throw new errorHandler_1.AppError(`Invalid role: ${input.role}`, constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            userUpdates.roleId = roleRecord.id;
        }
        if (input.password && input.password.trim()) {
            userUpdates.passwordHash = await bcrypt_1.default.hash(input.password.trim(), 10);
        }
        if (input.active !== undefined) {
            userUpdates.isActive = input.active;
        }
        else if (input.isActive !== undefined) {
            userUpdates.isActive = input.isActive;
        }
        if (input.email && input.email.trim()) {
            const emailNormalized = input.email.trim().toLowerCase();
            if (emailNormalized !== existing.email) {
                const conflict = await database_1.default.user.findUnique({ where: { email: emailNormalized } });
                if (conflict) {
                    throw new errorHandler_1.AppError('Email address already in use by another user', constants_1.HTTP_STATUS.CONFLICT);
                }
                userUpdates.email = emailNormalized;
            }
        }
        // Update staffProfile
        const profileUpdates = {};
        if (input.name !== undefined && input.name.trim()) {
            profileUpdates.name = input.name.trim();
        }
        if (input.phone !== undefined) {
            const rawPhone = input.phone && input.phone.trim() ? input.phone.trim() : null;
            if (rawPhone && rawPhone !== existing.phone) {
                const phoneConflict = await database_1.default.user.findFirst({
                    where: {
                        id: { not: id },
                        OR: [
                            { phone: rawPhone },
                            { staffProfile: { phone: rawPhone } },
                        ],
                    },
                });
                if (phoneConflict) {
                    throw new errorHandler_1.AppError('Phone number already in use by another user', constants_1.HTTP_STATUS.CONFLICT);
                }
            }
            userUpdates.phone = rawPhone;
            profileUpdates.phone = rawPhone;
        }
        if (input.specialties !== undefined) {
            const specs = Array.isArray(input.specialties) ? input.specialties : [];
            profileUpdates.specialties = specs.map((s) => (s === 'Massage' ? 'Body Massage' : s));
        }
        await database_1.default.$transaction(async (tx) => {
            if (Object.keys(userUpdates).length > 0) {
                await tx.user.update({
                    where: { id },
                    data: userUpdates,
                });
            }
            if (Object.keys(profileUpdates).length > 0) {
                if (existing.staffProfile) {
                    await tx.staffProfile.update({
                        where: { userId: id },
                        data: profileUpdates,
                    });
                }
                else {
                    await tx.staffProfile.create({
                        data: {
                            userId: id,
                            name: profileUpdates.name || existing.email.split('@')[0],
                            phone: profileUpdates.phone || null,
                            specialties: profileUpdates.specialties || [],
                        },
                    });
                }
            }
        });
        const updated = await database_1.default.user.findUnique({
            where: { id },
            include: {
                role: true,
                staffProfile: true,
            },
        });
        return this.formatUser(updated);
    }
    async deleteUser(id) {
        const existing = await database_1.default.user.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('User not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        await database_1.default.user.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async updateSalaryContract(userId, input) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            include: { staffProfile: true, role: true },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const monthlyTarget = Number(input.monthlyTarget) || 0;
        const basePay = Number(input.basePay) || 0;
        const commissionRate = Number(input.commissionRate) || 0;
        const fixedSalary = Number(input.fixedSalary) || 0;
        const targetScope = input.targetScope === 'SPA_TOTAL' ? 'SPA_TOTAL' : 'INDIVIDUAL';
        if (monthlyTarget < 0 || basePay < 0 || fixedSalary < 0) {
            throw new errorHandler_1.AppError('Monetary parameters must be non-negative', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (commissionRate < 0 || commissionRate > 100) {
            throw new errorHandler_1.AppError('Commission rate must be between 0% and 100%', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Advisory check: If basePay + target * commissionRate / 100 < fixedSalary
        let advisoryWarning = null;
        const projectedAtTarget = basePay + (monthlyTarget * commissionRate) / 100;
        if (projectedAtTarget < fixedSalary) {
            advisoryWarning =
                'Advisory: Base pay + commission at exact target (' +
                    projectedAtTarget.toLocaleString('en-US') +
                    ' FCFA) is lower than fixed salary (' +
                    fixedSalary.toLocaleString('en-US') +
                    ' FCFA). The employee will receive the fixed salary under the payout formula.';
        }
        let updatedProfile;
        if (user.staffProfile) {
            updatedProfile = await database_1.default.staffProfile.update({
                where: { userId },
                data: {
                    monthlyTarget,
                    basePay,
                    commissionRate,
                    fixedSalary,
                    targetScope,
                },
            });
        }
        else {
            updatedProfile = await database_1.default.staffProfile.create({
                data: {
                    userId,
                    name: user.email.split('@')[0],
                    monthlyTarget,
                    basePay,
                    commissionRate,
                    fixedSalary,
                    targetScope,
                },
            });
        }
        return {
            userId: user.id,
            staffName: updatedProfile.name,
            monthlyTarget: Number(updatedProfile.monthlyTarget),
            basePay: Number(updatedProfile.basePay),
            commissionRate: Number(updatedProfile.commissionRate),
            fixedSalary: Number(updatedProfile.fixedSalary),
            targetScope: updatedProfile.targetScope,
            advisoryWarning,
        };
    }
}
exports.UsersService = UsersService;
exports.usersService = new UsersService();
//# sourceMappingURL=users.service.js.map