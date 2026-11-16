import { z } from 'zod';
export declare const recordPaymentSchema: z.ZodObject<{
    invoiceId: z.ZodString;
    amount: z.ZodNumber;
    paymentMethod: z.ZodNativeEnum<{
        CASH: "CASH";
        MTN_MOMO: "MTN_MOMO";
        ORANGE_MONEY: "ORANGE_MONEY";
    }>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    invoiceId: string;
    amount: number;
    paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
    notes?: string | null | undefined;
}, {
    invoiceId: string;
    amount: number;
    paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
    notes?: string | null | undefined;
}>;
export declare const paymentQuerySchema: z.ZodObject<{
    invoiceId: z.ZodOptional<z.ZodString>;
    paymentMethod: z.ZodOptional<z.ZodNativeEnum<{
        CASH: "CASH";
        MTN_MOMO: "MTN_MOMO";
        ORANGE_MONEY: "ORANGE_MONEY";
    }>>;
    date: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
}, "strip", z.ZodTypeAny, {
    limit?: string | number | undefined;
    date?: string | undefined;
    page?: string | number | undefined;
    invoiceId?: string | undefined;
    paymentMethod?: "CASH" | "MTN_MOMO" | "ORANGE_MONEY" | undefined;
}, {
    limit?: string | number | undefined;
    date?: string | undefined;
    page?: string | number | undefined;
    invoiceId?: string | undefined;
    paymentMethod?: "CASH" | "MTN_MOMO" | "ORANGE_MONEY" | undefined;
}>;
//# sourceMappingURL=payments.validation.d.ts.map