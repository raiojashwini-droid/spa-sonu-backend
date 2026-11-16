import { z } from 'zod';
export declare const commissionQuerySchema: z.ZodObject<{
    technicianId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        PENDING: "PENDING";
        APPROVED: "APPROVED";
        PAID: "PAID";
        ADJUSTED: "ADJUSTED";
    }>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
}, "strip", z.ZodTypeAny, {
    limit?: string | number | undefined;
    status?: "PENDING" | "PAID" | "APPROVED" | "ADJUSTED" | undefined;
    technicianId?: string | undefined;
    page?: string | number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    limit?: string | number | undefined;
    status?: "PENDING" | "PAID" | "APPROVED" | "ADJUSTED" | undefined;
    technicianId?: string | undefined;
    page?: string | number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const addBonusSchema: z.ZodObject<{
    bonusAmount: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    bonusAmount: number;
    reason?: string | undefined;
}, {
    bonusAmount: number;
    reason?: string | undefined;
}>;
export declare const adjustCommissionSchema: z.ZodObject<{
    adjustedAmount: z.ZodOptional<z.ZodNumber>;
    adjustedRate: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    adjustedAmount?: number | undefined;
    adjustedRate?: number | undefined;
}, {
    reason: string;
    adjustedAmount?: number | undefined;
    adjustedRate?: number | undefined;
}>;
export declare const setCommissionRuleSchema: z.ZodObject<{
    serviceCategory: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    percentage: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fixedAmount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    type: z.ZodOptional<z.ZodEnum<["SERVICE", "REFERRAL"]>>;
}, "strip", z.ZodTypeAny, {
    percentage: number;
    serviceCategory: string;
    type?: "SERVICE" | "REFERRAL" | undefined;
    fixedAmount?: number | null | undefined;
}, {
    type?: "SERVICE" | "REFERRAL" | undefined;
    percentage?: number | undefined;
    fixedAmount?: number | null | undefined;
    serviceCategory?: string | undefined;
}>;
//# sourceMappingURL=commissions.validation.d.ts.map