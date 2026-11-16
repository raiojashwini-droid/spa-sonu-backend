import { z } from 'zod';
export declare const serviceMediaItemSchema: z.ZodObject<{
    mediaType: z.ZodNativeEnum<{
        BEFORE: "BEFORE";
        AFTER: "AFTER";
        ATTENDANCE_LOGIN: "ATTENDANCE_LOGIN";
        ATTENDANCE_LOGOUT: "ATTENDANCE_LOGOUT";
        CLEANING_BEFORE: "CLEANING_BEFORE";
        CLEANING_AFTER: "CLEANING_AFTER";
    }>;
    fileUrl: z.ZodString;
    note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    mediaType: "BEFORE" | "AFTER" | "ATTENDANCE_LOGIN" | "ATTENDANCE_LOGOUT" | "CLEANING_BEFORE" | "CLEANING_AFTER";
    fileUrl: string;
    note?: string | null | undefined;
}, {
    mediaType: "BEFORE" | "AFTER" | "ATTENDANCE_LOGIN" | "ATTENDANCE_LOGOUT" | "CLEANING_BEFORE" | "CLEANING_AFTER";
    fileUrl: string;
    note?: string | null | undefined;
}>;
export declare const completeServiceSchema: z.ZodObject<{
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    media: z.ZodOptional<z.ZodArray<z.ZodObject<{
        mediaType: z.ZodNativeEnum<{
            BEFORE: "BEFORE";
            AFTER: "AFTER";
            ATTENDANCE_LOGIN: "ATTENDANCE_LOGIN";
            ATTENDANCE_LOGOUT: "ATTENDANCE_LOGOUT";
            CLEANING_BEFORE: "CLEANING_BEFORE";
            CLEANING_AFTER: "CLEANING_AFTER";
        }>;
        fileUrl: z.ZodString;
        note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        mediaType: "BEFORE" | "AFTER" | "ATTENDANCE_LOGIN" | "ATTENDANCE_LOGOUT" | "CLEANING_BEFORE" | "CLEANING_AFTER";
        fileUrl: string;
        note?: string | null | undefined;
    }, {
        mediaType: "BEFORE" | "AFTER" | "ATTENDANCE_LOGIN" | "ATTENDANCE_LOGOUT" | "CLEANING_BEFORE" | "CLEANING_AFTER";
        fileUrl: string;
        note?: string | null | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    media?: {
        mediaType: "BEFORE" | "AFTER" | "ATTENDANCE_LOGIN" | "ATTENDANCE_LOGOUT" | "CLEANING_BEFORE" | "CLEANING_AFTER";
        fileUrl: string;
        note?: string | null | undefined;
    }[] | undefined;
    notes?: string | null | undefined;
}, {
    media?: {
        mediaType: "BEFORE" | "AFTER" | "ATTENDANCE_LOGIN" | "ATTENDANCE_LOGOUT" | "CLEANING_BEFORE" | "CLEANING_AFTER";
        fileUrl: string;
        note?: string | null | undefined;
    }[] | undefined;
    notes?: string | null | undefined;
}>;
//# sourceMappingURL=serviceCompletion.validation.d.ts.map