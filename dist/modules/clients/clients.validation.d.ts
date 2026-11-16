import { z } from 'zod';
export declare const createClientSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    whatsapp: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quartier: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    birthday: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    anniversary: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    source: z.ZodOptional<z.ZodEnum<["DIRECT", "STAFF_REFERRAL", "CLIENT_REFERRAL"]>>;
    introducedByEmployeeId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>;
    referredByClientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    recommendedByName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    recommendedByPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    name: string;
    whatsapp?: string | null | undefined;
    quartier?: string | null | undefined;
    birthday?: string | null | undefined;
    anniversary?: string | null | undefined;
    source?: "DIRECT" | "STAFF_REFERRAL" | "CLIENT_REFERRAL" | undefined;
    introducedByEmployeeId?: string | null | undefined;
    referredByClientId?: string | null | undefined;
    recommendedByName?: string | null | undefined;
    recommendedByPhone?: string | null | undefined;
}, {
    phone: string;
    name: string;
    whatsapp?: string | null | undefined;
    quartier?: string | null | undefined;
    birthday?: string | null | undefined;
    anniversary?: string | null | undefined;
    source?: "DIRECT" | "STAFF_REFERRAL" | "CLIENT_REFERRAL" | undefined;
    introducedByEmployeeId?: string | null | undefined;
    referredByClientId?: string | null | undefined;
    recommendedByName?: string | null | undefined;
    recommendedByPhone?: string | null | undefined;
}>;
export declare const updateClientSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    whatsapp: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quartier: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    birthday: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    anniversary: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "active", "inactive"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    lastServiceDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    phone?: string | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    status?: "ACTIVE" | "INACTIVE" | "active" | "inactive" | undefined;
    whatsapp?: string | null | undefined;
    quartier?: string | null | undefined;
    birthday?: string | null | undefined;
    anniversary?: string | null | undefined;
    lastServiceDate?: string | null | undefined;
}, {
    phone?: string | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    status?: "ACTIVE" | "INACTIVE" | "active" | "inactive" | undefined;
    whatsapp?: string | null | undefined;
    quartier?: string | null | undefined;
    birthday?: string | null | undefined;
    anniversary?: string | null | undefined;
    lastServiceDate?: string | null | undefined;
}>;
export declare const updateClientStatusSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "active", "inactive"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    status?: "ACTIVE" | "INACTIVE" | "active" | "inactive" | undefined;
}, {
    isActive?: boolean | undefined;
    status?: "ACTIVE" | "INACTIVE" | "active" | "inactive" | undefined;
}>;
export declare const addClientMediaSchema: z.ZodObject<{
    mediaType: z.ZodEnum<["BEFORE", "AFTER"]>;
    fileUrl: z.ZodString;
    note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    mediaType: "BEFORE" | "AFTER";
    fileUrl: string;
    note?: string | null | undefined;
}, {
    mediaType: "BEFORE" | "AFTER";
    fileUrl: string;
    note?: string | null | undefined;
}>;
export declare const clientQuerySchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ALL", "ACTIVE", "INACTIVE", "all", "active", "inactive"]>>;
    isActive: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    introducedByEmployeeId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit?: string | number | undefined;
    search?: string | undefined;
    isActive?: string | boolean | undefined;
    status?: "ACTIVE" | "INACTIVE" | "active" | "inactive" | "ALL" | "all" | undefined;
    introducedByEmployeeId?: string | undefined;
    page?: string | number | undefined;
}, {
    limit?: string | number | undefined;
    search?: string | undefined;
    isActive?: string | boolean | undefined;
    status?: "ACTIVE" | "INACTIVE" | "active" | "inactive" | "ALL" | "all" | undefined;
    introducedByEmployeeId?: string | undefined;
    page?: string | number | undefined;
}>;
//# sourceMappingURL=clients.validation.d.ts.map