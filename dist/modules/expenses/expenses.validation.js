"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseQuerySchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createExpenseSchema = zod_1.z.object({
    date: zod_1.z.string().optional().default(() => new Date().toISOString().slice(0, 10)),
    category: zod_1.z.preprocess((val) => {
        if (typeof val === 'string') {
            const formatted = val.toUpperCase().replace(/\s+/g, '_').replace(/[\/\-]/g, '_');
            if (formatted.includes('GENERATOR'))
                return client_1.ExpenseCategory.GENERATOR_FUEL;
            if (formatted in client_1.ExpenseCategory)
                return formatted;
        }
        return val;
    }, zod_1.z.nativeEnum(client_1.ExpenseCategory)),
    amount: zod_1.z.coerce.number().positive('Expense amount must be greater than 0'),
    paymentMethod: zod_1.z.preprocess((val) => {
        if (typeof val === 'string') {
            const formatted = val.toUpperCase().replace(/\s+/g, '_');
            if (formatted === 'MTN_MOMO' || formatted === 'MTNMOMO' || formatted === 'MOMO')
                return client_1.PaymentMethod.MTN_MOMO;
            if (formatted === 'ORANGE_MONEY' || formatted === 'ORANGEMONEY' || formatted === 'OM')
                return client_1.PaymentMethod.ORANGE_MONEY;
            if (formatted === 'CASH')
                return client_1.PaymentMethod.CASH;
        }
        return val;
    }, zod_1.z.nativeEnum(client_1.PaymentMethod)),
    note: zod_1.z.string({ required_error: 'Expense reason/note is required' }).trim().min(1, 'Please enter the reason for this expense'),
});
exports.expenseQuerySchema = zod_1.z.object({
    date: zod_1.z.string().optional(),
    category: zod_1.z.nativeEnum(client_1.ExpenseCategory).optional(),
    paymentMethod: zod_1.z.nativeEnum(client_1.PaymentMethod).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
//# sourceMappingURL=expenses.validation.js.map