"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRetentionSchema = exports.purgeLogsSchema = exports.logsQuerySchema = exports.processRemindersQuerySchema = exports.dailyCloseTriggerSchema = exports.sendCustomMessageSchema = exports.updateAutomationSchema = void 0;
const zod_1 = require("zod");
const whatsapp_types_1 = require("./whatsapp.types");
exports.updateAutomationSchema = zod_1.z.object({
    template: zod_1.z.string().min(1, 'Template cannot be empty').optional(),
    isActive: zod_1.z.boolean().optional(),
    enabled: zod_1.z.boolean().optional(),
    timing: zod_1.z.string().nullable().optional(),
    scheduleTime: zod_1.z.string().nullable().optional(),
});
exports.sendCustomMessageSchema = zod_1.z.object({
    recipientPhone: zod_1.z.string().min(6, 'Valid recipient phone is required'),
    message: zod_1.z.string().min(1, 'Message text is required'),
    clientId: zod_1.z.string().optional(),
    appointmentId: zod_1.z.string().optional(),
    invoiceId: zod_1.z.string().optional(),
    automationType: zod_1.z.nativeEnum(whatsapp_types_1.WhatsAppAutomationType).optional(),
    idempotencyKey: zod_1.z.string().optional(),
});
exports.dailyCloseTriggerSchema = zod_1.z.object({
    businessDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    recipientPhone: zod_1.z.string().optional(),
});
exports.processRemindersQuerySchema = zod_1.z.object({
    date: zod_1.z.string().optional(),
});
exports.logsQuerySchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(whatsapp_types_1.WhatsAppMessageStatus).optional(),
    automationType: zod_1.z.nativeEnum(whatsapp_types_1.WhatsAppAutomationType).optional(),
    clientId: zod_1.z.string().optional(),
    appointmentId: zod_1.z.string().optional(),
    invoiceId: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().optional(),
    limit: zod_1.z.coerce.number().optional(),
});
exports.purgeLogsSchema = zod_1.z.object({
    days: zod_1.z.coerce.number().min(1).max(365).optional().default(30),
});
exports.updateRetentionSchema = zod_1.z.object({
    days: zod_1.z.coerce.number().min(1).max(365),
});
//# sourceMappingURL=whatsapp.validation.js.map