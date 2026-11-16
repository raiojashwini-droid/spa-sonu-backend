"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("../../config/database"));
const jwt_1 = require("../../utils/jwt");
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class AuthService {
    async login(input) {
        const inputClean = input.email.trim();
        const emailNormalized = inputClean.toLowerCase();
        // Find user by email (Google OAuth / login identity)
        const user = await database_1.default.user.findUnique({
            where: { email: emailNormalized },
            include: {
                role: true,
                staffProfile: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('Invalid email or password', constants_1.HTTP_STATUS.UNAUTHORIZED);
        }
        // Check isActive status
        if (!user.isActive) {
            throw new errorHandler_1.AppError('Account is deactivated. Please contact manager.', constants_1.HTTP_STATUS.FORBIDDEN);
        }
        // Compare password using bcrypt
        const isPasswordValid = await bcrypt_1.default.compare(input.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new errorHandler_1.AppError('Invalid email or password', constants_1.HTTP_STATUS.UNAUTHORIZED);
        }
        // Extract and normalize specialties for session context
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
        let roleName = user.role.name;
        if (roleName === 'MARKETER' || specialties.some((s) => s.toLowerCase() === 'marketer')) {
            roleName = 'MARKETER';
            specialties = specialties.filter((s) => s.toLowerCase() !== 'marketer');
        }
        // Generate JWT token with resolved role
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            role: roleName,
        });
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone || user.staffProfile?.phone || null,
                role: roleName,
                name: user.staffProfile?.name || roleName,
                specialties,
            },
        };
    }
    async getCurrentUser(userId) {
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            include: {
                role: true,
                staffProfile: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        if (!user.isActive) {
            throw new errorHandler_1.AppError('Account is deactivated', constants_1.HTTP_STATUS.FORBIDDEN);
        }
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
        let roleName = user.role.name;
        if (roleName === 'MARKETER' || specialties.some((s) => s.toLowerCase() === 'marketer')) {
            roleName = 'MARKETER';
            specialties = specialties.filter((s) => s.toLowerCase() !== 'marketer');
        }
        return {
            id: user.id,
            email: user.email,
            phone: user.phone || user.staffProfile?.phone || null,
            role: roleName,
            staffProfile: user.staffProfile
                ? {
                    id: user.staffProfile.id,
                    name: user.staffProfile.name,
                    phone: user.staffProfile.phone || user.phone,
                    specialties,
                }
                : null,
        };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map