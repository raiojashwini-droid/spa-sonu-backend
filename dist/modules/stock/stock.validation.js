"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewDailyAuditSchema = exports.stockDailyAuditQuerySchema = exports.createDailyAuditSchema = exports.deductRetailStockSchema = exports.refillRetailSchema = exports.updateRetailProductSchema = exports.createRetailProductSchema = exports.stockActivityQuerySchema = exports.stockQuerySchema = exports.updateStockSchema = exports.refillStockSchema = exports.createStockSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createStockSchema = zod_1.z.object({
    name: zod_1.z.string({ required_error: 'Stock item name is required' }).min(2, 'Name must be at least 2 characters'),
    category: zod_1.z.string().optional(),
    quantity: zod_1.z.number({ required_error: 'Quantity is required' }).nonnegative('Quantity cannot be negative'),
    unit: zod_1.z.string({ required_error: 'Unit is required' }).min(1, 'Unit cannot be empty'),
});
exports.refillStockSchema = zod_1.z.object({
    quantity: zod_1.z.number({ required_error: 'Refill quantity is required' }).positive('Quantity must be greater than 0'),
    reason: zod_1.z.string().optional(),
});
exports.updateStockSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    category: zod_1.z.string().optional(),
    quantity: zod_1.z.number().nonnegative().optional(),
    unit: zod_1.z.string().min(1).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.stockQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    isActive: zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()]).optional(),
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
exports.stockActivityQuerySchema = zod_1.z.object({
    serviceStockId: zod_1.z.string().uuid().optional(),
    type: zod_1.z.nativeEnum(client_1.StockActivityType).optional(),
    date: zod_1.z.string().optional(),
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
exports.createRetailProductSchema = zod_1.z.object({
    barcode: zod_1.z.string().optional(),
    name: zod_1.z.string({ required_error: 'Product name is required' }).min(2),
    category: zod_1.z.nativeEnum(client_1.RetailCategory),
    price: zod_1.z.number({ required_error: 'Price is required' }).positive('Price must be greater than 0'),
    quantity: zod_1.z.number().int().nonnegative('Quantity must be 0 or more').default(0),
});
exports.updateRetailProductSchema = zod_1.z.object({
    barcode: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2).optional(),
    price: zod_1.z.number().positive().optional(),
    quantity: zod_1.z.number().int().nonnegative().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.refillRetailSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().positive('Quantity must be a positive integer'),
});
exports.deductRetailStockSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().uuid('Invalid productId UUID'),
        quantity: zod_1.z.number().int().positive('Quantity must be a positive integer'),
    })).min(1, 'At least one item required'),
});
exports.createDailyAuditSchema = zod_1.z.object({
    serviceStockId: zod_1.z.string().optional().nullable(),
    productName: zod_1.z.string({ required_error: 'Product name is required' }).min(2, 'Product name must be at least 2 characters'),
    photoUrl: zod_1.z.string({ required_error: 'Photo is required' }).min(5, 'Valid photo URL is required'),
    publicId: zod_1.z.string().optional().nullable(),
    remarks: zod_1.z.string().optional().nullable(),
    estimatedRemaining: zod_1.z.string().optional().nullable(),
    date: zod_1.z.string().optional(),
});
exports.stockDailyAuditQuerySchema = zod_1.z.object({
    date: zod_1.z.string().optional(),
    technicianId: zod_1.z.string().optional(),
    serviceStockId: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
exports.reviewDailyAuditSchema = zod_1.z.object({
    status: zod_1.z.enum(['REVIEWED', 'FLAGGED']),
    reviewNotes: zod_1.z.string().optional().nullable(),
});
//# sourceMappingURL=stock.validation.js.map