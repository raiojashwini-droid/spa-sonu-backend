import { z } from 'zod';
export declare const updateAutomationSchema: z.ZodObject<{
    template: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    timing: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    scheduleTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    template?: string | undefined;
    timing?: string | null | undefined;
    enabled?: boolean | undefined;
    scheduleTime?: string | null | undefined;
}, {
    isActive?: boolean | undefined;
    template?: string | undefined;
    timing?: string | null | undefined;
    enabled?: boolean | undefined;
    scheduleTime?: string | null | undefined;
}>;
export declare const sendCustomMessageSchema: z.ZodObject<{
    recipientPhone: z.ZodString;
    message: z.ZodString;
    clientId: z.ZodOptional<z.ZodString>;
    appointmentId: z.ZodOptional<z.ZodString>;
    invoiceId: z.ZodOptional<z.ZodString>;
    automationType: z.ZodOptional<z.ZodNativeEnum<{
        BIRTHDAY: "BIRTHDAY";
        ANNIVERSARY: "ANNIVERSARY";
        APPOINTMENT_REMINDER: "APPOINTMENT_REMINDER";
        APPOINTMENT_24H: "APPOINTMENT_24H";
        APPOINTMENT_2H: "APPOINTMENT_2H";
        AFTER_SERVICE: "AFTER_SERVICE";
        INVOICE_THANKYOU: "INVOICE_THANKYOU";
        PAYMENT_CONFIRMATION: "PAYMENT_CONFIRMATION";
        REBOOKING: "REBOOKING";
        DAILY_SUMMARY: "DAILY_SUMMARY";
        DAILY_CLOSE_BOSS: "DAILY_CLOSE_BOSS";
        CLIENT_WELCOME: "CLIENT_WELCOME";
    }>>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    recipientPhone: string;
    clientId?: string | undefined;
    appointmentId?: string | undefined;
    idempotencyKey?: string | undefined;
    invoiceId?: string | undefined;
    automationType?: "BIRTHDAY" | "ANNIVERSARY" | "APPOINTMENT_REMINDER" | "APPOINTMENT_24H" | "APPOINTMENT_2H" | "AFTER_SERVICE" | "INVOICE_THANKYOU" | "PAYMENT_CONFIRMATION" | "REBOOKING" | "DAILY_SUMMARY" | "DAILY_CLOSE_BOSS" | "CLIENT_WELCOME" | undefined;
}, {
    message: string;
    recipientPhone: string;
    clientId?: string | undefined;
    appointmentId?: string | undefined;
    idempotencyKey?: string | undefined;
    invoiceId?: string | undefined;
    automationType?: "BIRTHDAY" | "ANNIVERSARY" | "APPOINTMENT_REMINDER" | "APPOINTMENT_24H" | "APPOINTMENT_2H" | "AFTER_SERVICE" | "INVOICE_THANKYOU" | "PAYMENT_CONFIRMATION" | "REBOOKING" | "DAILY_SUMMARY" | "DAILY_CLOSE_BOSS" | "CLIENT_WELCOME" | undefined;
}>;
export declare const dailyCloseTriggerSchema: z.ZodObject<{
    businessDate: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
    recipientPhone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
    recipientPhone?: string | undefined;
    businessDate?: string | undefined;
}, {
    date?: string | undefined;
    recipientPhone?: string | undefined;
    businessDate?: string | undefined;
}>;
export declare const processRemindersQuerySchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
}, {
    date?: string | undefined;
}>;
export declare const logsQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodNativeEnum<{
        QUEUED: "QUEUED";
        PENDING: "PENDING";
        SENT: "SENT";
        DELIVERED: "DELIVERED";
        FAILED: "FAILED";
        SKIPPED: "SKIPPED";
    }>>;
    automationType: z.ZodOptional<z.ZodNativeEnum<{
        BIRTHDAY: "BIRTHDAY";
        ANNIVERSARY: "ANNIVERSARY";
        APPOINTMENT_REMINDER: "APPOINTMENT_REMINDER";
        APPOINTMENT_24H: "APPOINTMENT_24H";
        APPOINTMENT_2H: "APPOINTMENT_2H";
        AFTER_SERVICE: "AFTER_SERVICE";
        INVOICE_THANKYOU: "INVOICE_THANKYOU";
        PAYMENT_CONFIRMATION: "PAYMENT_CONFIRMATION";
        REBOOKING: "REBOOKING";
        DAILY_SUMMARY: "DAILY_SUMMARY";
        DAILY_CLOSE_BOSS: "DAILY_CLOSE_BOSS";
        CLIENT_WELCOME: "CLIENT_WELCOME";
    }>>;
    clientId: z.ZodOptional<z.ZodString>;
    appointmentId: z.ZodOptional<z.ZodString>;
    invoiceId: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
    search?: string | undefined;
    phone?: string | undefined;
    status?: "QUEUED" | "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED" | undefined;
    clientId?: string | undefined;
    appointmentId?: string | undefined;
    page?: number | undefined;
    invoiceId?: string | undefined;
    automationType?: "BIRTHDAY" | "ANNIVERSARY" | "APPOINTMENT_REMINDER" | "APPOINTMENT_24H" | "APPOINTMENT_2H" | "AFTER_SERVICE" | "INVOICE_THANKYOU" | "PAYMENT_CONFIRMATION" | "REBOOKING" | "DAILY_SUMMARY" | "DAILY_CLOSE_BOSS" | "CLIENT_WELCOME" | undefined;
}, {
    limit?: number | undefined;
    search?: string | undefined;
    phone?: string | undefined;
    status?: "QUEUED" | "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED" | undefined;
    clientId?: string | undefined;
    appointmentId?: string | undefined;
    page?: number | undefined;
    invoiceId?: string | undefined;
    automationType?: "BIRTHDAY" | "ANNIVERSARY" | "APPOINTMENT_REMINDER" | "APPOINTMENT_24H" | "APPOINTMENT_2H" | "AFTER_SERVICE" | "INVOICE_THANKYOU" | "PAYMENT_CONFIRMATION" | "REBOOKING" | "DAILY_SUMMARY" | "DAILY_CLOSE_BOSS" | "CLIENT_WELCOME" | undefined;
}>;
export declare const purgeLogsSchema: z.ZodObject<{
    days: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    days: number;
}, {
    days?: number | undefined;
}>;
export declare const updateRetentionSchema: z.ZodObject<{
    days: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    days: number;
}, {
    days: number;
}>;
//# sourceMappingURL=whatsapp.validation.d.ts.map