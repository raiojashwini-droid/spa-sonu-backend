"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientQuerySchema = exports.addClientMediaSchema = exports.updateClientStatusSchema = exports.updateClientSchema = exports.createClientSchema = void 0;
const zod_1 = require("zod");
exports.createClientSchema = zod_1.z.object({
    name: zod_1.z.string({ required_error: 'Client name is required' }).min(1, 'Client name is required'),
    phone: zod_1.z.string({ required_error: 'Phone number is required' }).min(1, 'Phone number is required'),
    whatsapp: zod_1.z.string().optional().nullable(),
    quartier: zod_1.z.string().optional().nullable(),
    birthday: zod_1.z.string().optional().nullable(),
    anniversary: zod_1.z.string().optional().nullable(),
    source: zod_1.z.enum(['DIRECT', 'STAFF_REFERRAL', 'CLIENT_REFERRAL']).optional(),
    introducedByEmployeeId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.literal(''), zod_1.z.null()]).optional(),
    referredByClientId: zod_1.z.string().uuid().optional().nullable(),
    recommendedByName: zod_1.z.string().optional().nullable(),
    recommendedByPhone: zod_1.z.string().optional().nullable(),
});
exports.updateClientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name cannot be empty').optional(),
    phone: zod_1.z.string().min(1, 'Phone cannot be empty').optional(),
    whatsapp: zod_1.z.string().optional().nullable(),
    quartier: zod_1.z.string().optional().nullable(),
    birthday: zod_1.z.string().optional().nullable(),
    anniversary: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'active', 'inactive']).optional(),
    isActive: zod_1.z.boolean().optional(),
    lastServiceDate: zod_1.z.string().optional().nullable(),
});
exports.updateClientStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'active', 'inactive']).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.addClientMediaSchema = zod_1.z.object({
    mediaType: zod_1.z.enum(['BEFORE', 'AFTER'], { required_error: 'mediaType must be BEFORE or AFTER' }),
    fileUrl: zod_1.z.string({ required_error: 'fileUrl is required' }).min(1, 'fileUrl is required'),
    note: zod_1.z.string().optional().nullable(),
});
exports.clientQuerySchema = zod_1.z.object({
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'all', 'active', 'inactive']).optional(),
    isActive: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]).optional(),
    introducedByEmployeeId: zod_1.z.string().optional(),
});
//# sourceMappingURL=clients.validation.js.map