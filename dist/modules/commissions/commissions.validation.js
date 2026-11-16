"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCommissionRuleSchema = exports.adjustCommissionSchema = exports.addBonusSchema = exports.commissionQuerySchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.commissionQuerySchema = zod_1.z.object({
    technicianId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.nativeEnum(client_1.CommissionStatus).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
exports.addBonusSchema = zod_1.z.object({
    bonusAmount: zod_1.z.number({ required_error: 'bonusAmount is required' }).positive('bonusAmount must be greater than 0'),
    reason: zod_1.z.string().optional(),
});
exports.adjustCommissionSchema = zod_1.z.object({
    adjustedAmount: zod_1.z.number().nonnegative('adjustedAmount cannot be negative').optional(),
    adjustedRate: zod_1.z.number().positive('adjustedRate must be greater than 0').optional(),
    reason: zod_1.z.string({ required_error: 'reason is required for commission adjustments' }).min(3, 'Reason must be at least 3 characters'),
});
exports.setCommissionRuleSchema = zod_1.z.object({
    serviceCategory: zod_1.z.string().optional().default('General'),
    percentage: zod_1.z.number().nonnegative().optional().default(0),
    fixedAmount: zod_1.z.number().nonnegative().optional().nullable(),
    type: zod_1.z.enum(['SERVICE', 'REFERRAL']).optional(),
});
//# sourceMappingURL=commissions.validation.js.map