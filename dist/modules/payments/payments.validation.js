"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentQuerySchema = exports.recordPaymentSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.recordPaymentSchema = zod_1.z.object({
    invoiceId: zod_1.z.string({ required_error: 'invoiceId is required' }).uuid('Invalid invoiceId UUID'),
    amount: zod_1.z.number({ required_error: 'amount is required' }).positive('Payment amount must be greater than zero'),
    paymentMethod: zod_1.z.nativeEnum(client_1.PaymentMethod, {
        required_error: 'paymentMethod must be one of: CASH, MTN_MOMO, ORANGE_MONEY',
    }),
    notes: zod_1.z.string().optional().nullable(),
});
exports.paymentQuerySchema = zod_1.z.object({
    invoiceId: zod_1.z.string().optional(),
    paymentMethod: zod_1.z.nativeEnum(client_1.PaymentMethod).optional(),
    date: zod_1.z.string().optional(),
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
//# sourceMappingURL=payments.validation.js.map