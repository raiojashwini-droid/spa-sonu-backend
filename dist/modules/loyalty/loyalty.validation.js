"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebookingQuerySchema = exports.awardRewardSchema = exports.redeemPointsSchema = exports.adjustPointsSchema = exports.updateLoyaltySettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateLoyaltySettingsSchema = zod_1.z.object({
    spendAmountForPoint: zod_1.z.number().positive('spendAmountForPoint must be positive').optional(),
    pointsPerSpend: zod_1.z.number().int().positive('pointsPerSpend must be positive integer').optional(),
    pointsForDiscount: zod_1.z.number().int().positive('pointsForDiscount must be positive integer').optional(),
    discountAmount: zod_1.z.number().positive('discountAmount must be positive').optional(),
    minPointsToRedeem: zod_1.z.number().int().nonnegative('minPointsToRedeem must be non-negative integer').optional(),
    birthdayRewardPoints: zod_1.z.number().int().positive('birthdayRewardPoints must be positive integer').optional(),
    anniversaryRewardPoints: zod_1.z.number().int().positive('anniversaryRewardPoints must be positive integer').optional(),
    pointsExpiryEnabled: zod_1.z.boolean().optional(),
    expiryDays: zod_1.z.number().int().positive().optional(),
    servicePoints: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
});
exports.adjustPointsSchema = zod_1.z.object({
    pointsDelta: zod_1.z.number().int({ message: 'pointsDelta must be an integer' }),
    reason: zod_1.z.string({ required_error: 'reason is required for points adjustment' }).min(3, 'Reason must be at least 3 characters'),
});
exports.redeemPointsSchema = zod_1.z.object({
    pointsToRedeem: zod_1.z.number({ required_error: 'pointsToRedeem is required' }).int().positive('pointsToRedeem must be a positive integer'),
});
exports.awardRewardSchema = zod_1.z.object({
    rewardType: zod_1.z.enum(['BIRTHDAY', 'ANNIVERSARY'], { required_error: 'rewardType must be BIRTHDAY or ANNIVERSARY' }),
    points: zod_1.z.number().int().positive('points must be positive integer').optional(),
    note: zod_1.z.string().optional(),
});
exports.rebookingQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['DUE', 'OVERDUE', 'LAPSED']).optional(),
    daysInactive: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    quartier: zod_1.z.string().optional(),
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
//# sourceMappingURL=loyalty.validation.js.map