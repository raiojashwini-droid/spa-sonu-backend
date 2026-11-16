"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    email: zod_1.z.string().email('Valid email address is required'),
    phone: zod_1.z.string().optional().nullable(),
    username: zod_1.z.string().optional(),
    role: zod_1.z.string().min(1, 'Role is required'),
    password: zod_1.z.string().min(6, 'Password is required (minimum 6 characters)'),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email('Valid email address is required').optional().or(zod_1.z.literal('')),
    phone: zod_1.z.string().optional().nullable(),
    username: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    password: zod_1.z.string().optional(),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
    active: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=users.validation.js.map