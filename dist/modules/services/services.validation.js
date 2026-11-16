"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceQuerySchema = exports.updateServiceSchema = exports.createServiceSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createServiceSchema = zod_1.z.object({
    name: zod_1.z.string({ required_error: 'Service name is required' }).trim().min(1, 'Service name cannot be empty'),
    category: zod_1.z.string({ required_error: 'Category is required' }).trim().min(1, 'Category cannot be empty'),
    description: zod_1.z.string().trim().optional().nullable(),
    duration: zod_1.z.coerce.number().int().positive('Duration must be greater than 0'),
    price: zod_1.z.coerce.number().positive('Price must be greater than 0'),
    status: zod_1.z.nativeEnum(client_1.ServiceStatus).optional().default(client_1.ServiceStatus.ACTIVE),
});
exports.updateServiceSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Service name cannot be empty').optional(),
    category: zod_1.z.string().trim().min(1, 'Category cannot be empty').optional(),
    description: zod_1.z.string().trim().optional().nullable(),
    duration: zod_1.z.coerce.number().int().positive('Duration must be greater than 0').optional(),
    price: zod_1.z.coerce.number().positive('Price must be greater than 0').optional(),
    status: zod_1.z.nativeEnum(client_1.ServiceStatus).optional(),
});
exports.serviceQuerySchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.ServiceStatus).optional(),
    search: zod_1.z.string().optional(),
});
//# sourceMappingURL=services.validation.js.map