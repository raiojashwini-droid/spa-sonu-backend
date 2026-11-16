import { z } from 'zod';
export declare const updateLoyaltySettingsSchema: z.ZodObject<{
    spendAmountForPoint: z.ZodOptional<z.ZodNumber>;
    pointsPerSpend: z.ZodOptional<z.ZodNumber>;
    pointsForDiscount: z.ZodOptional<z.ZodNumber>;
    discountAmount: z.ZodOptional<z.ZodNumber>;
    minPointsToRedeem: z.ZodOptional<z.ZodNumber>;
    birthdayRewardPoints: z.ZodOptional<z.ZodNumber>;
    anniversaryRewardPoints: z.ZodOptional<z.ZodNumber>;
    pointsExpiryEnabled: z.ZodOptional<z.ZodBoolean>;
    expiryDays: z.ZodOptional<z.ZodNumber>;
    servicePoints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    spendAmountForPoint?: number | undefined;
    pointsPerSpend?: number | undefined;
    pointsForDiscount?: number | undefined;
    discountAmount?: number | undefined;
    minPointsToRedeem?: number | undefined;
    birthdayRewardPoints?: number | undefined;
    anniversaryRewardPoints?: number | undefined;
    pointsExpiryEnabled?: boolean | undefined;
    expiryDays?: number | undefined;
    servicePoints?: Record<string, number> | undefined;
}, {
    spendAmountForPoint?: number | undefined;
    pointsPerSpend?: number | undefined;
    pointsForDiscount?: number | undefined;
    discountAmount?: number | undefined;
    minPointsToRedeem?: number | undefined;
    birthdayRewardPoints?: number | undefined;
    anniversaryRewardPoints?: number | undefined;
    pointsExpiryEnabled?: boolean | undefined;
    expiryDays?: number | undefined;
    servicePoints?: Record<string, number> | undefined;
}>;
export declare const adjustPointsSchema: z.ZodObject<{
    pointsDelta: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    pointsDelta: number;
}, {
    reason: string;
    pointsDelta: number;
}>;
export declare const redeemPointsSchema: z.ZodObject<{
    pointsToRedeem: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    pointsToRedeem: number;
}, {
    pointsToRedeem: number;
}>;
export declare const awardRewardSchema: z.ZodObject<{
    rewardType: z.ZodEnum<["BIRTHDAY", "ANNIVERSARY"]>;
    points: z.ZodOptional<z.ZodNumber>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rewardType: "BIRTHDAY" | "ANNIVERSARY";
    note?: string | undefined;
    points?: number | undefined;
}, {
    rewardType: "BIRTHDAY" | "ANNIVERSARY";
    note?: string | undefined;
    points?: number | undefined;
}>;
export declare const rebookingQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["DUE", "OVERDUE", "LAPSED"]>>;
    daysInactive: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    quartier: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
}, "strip", z.ZodTypeAny, {
    limit?: string | number | undefined;
    status?: "DUE" | "OVERDUE" | "LAPSED" | undefined;
    quartier?: string | undefined;
    page?: string | number | undefined;
    daysInactive?: string | number | undefined;
}, {
    limit?: string | number | undefined;
    status?: "DUE" | "OVERDUE" | "LAPSED" | undefined;
    quartier?: string | undefined;
    page?: string | number | undefined;
    daysInactive?: string | number | undefined;
}>;
//# sourceMappingURL=loyalty.validation.d.ts.map