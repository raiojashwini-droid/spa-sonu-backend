import { z } from 'zod';
export declare const dateRangeQuerySchema: z.ZodObject<{
    period: z.ZodOptional<z.ZodEnum<["today", "weekly", "monthly", "custom", "7d", "30d"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    period?: "custom" | "today" | "weekly" | "monthly" | "7d" | "30d" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    period?: "custom" | "today" | "weekly" | "monthly" | "7d" | "30d" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const topServicesQuerySchema: z.ZodObject<{
    period: z.ZodOptional<z.ZodEnum<["today", "weekly", "monthly", "custom", "7d", "30d"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
} & {
    limit: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
}, "strip", z.ZodTypeAny, {
    limit?: string | number | undefined;
    period?: "custom" | "today" | "weekly" | "monthly" | "7d" | "30d" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    limit?: string | number | undefined;
    period?: "custom" | "today" | "weekly" | "monthly" | "7d" | "30d" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const technicianReportQuerySchema: z.ZodObject<{
    period: z.ZodOptional<z.ZodEnum<["today", "weekly", "monthly", "custom", "7d", "30d"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
} & {
    technicianId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    technicianId?: string | undefined;
    period?: "custom" | "today" | "weekly" | "monthly" | "7d" | "30d" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    technicianId?: string | undefined;
    period?: "custom" | "today" | "weekly" | "monthly" | "7d" | "30d" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
//# sourceMappingURL=reports.validation.d.ts.map