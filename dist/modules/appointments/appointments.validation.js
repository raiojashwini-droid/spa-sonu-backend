"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentQuerySchema = exports.changeAppointmentStatusSchema = exports.updateAppointmentSchema = exports.createAppointmentSchema = exports.appointmentTimeSchema = exports.createAppointmentServiceItemSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createAppointmentServiceItemSchema = zod_1.z.object({
    serviceId: zod_1.z.string({ required_error: 'serviceId is required' }).uuid('Invalid serviceId UUID'),
    technicianId: zod_1.z.string().uuid('Invalid technicianId UUID').optional(),
    price: zod_1.z.number().positive('Price must be positive').optional(),
});
exports.appointmentTimeSchema = zod_1.z
    .string({ required_error: 'appointmentTime is required' })
    .transform((val) => {
    if (!val)
        return val;
    const clean = val.trim();
    // Convert 12-hour format e.g. "10:45 AM", "02:30 PM", "2:30 pm"
    const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match12) {
        let hours = parseInt(match12[1], 10);
        const mins = match12[2];
        const period = match12[3].toUpperCase();
        if (period === 'PM' && hours < 12)
            hours += 12;
        if (period === 'AM' && hours === 12)
            hours = 0;
        return `${String(hours).padStart(2, '0')}:${mins}`;
    }
    // Extract HH:MM from labeled strings like "10:45 (10:45 AM)" or "10:45:00"
    const match24 = clean.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
        const hours = String(match24[1]).padStart(2, '0');
        const mins = match24[2];
        return `${hours}:${mins}`;
    }
    return clean;
})
    .pipe(zod_1.z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)')
    .refine((t) => {
    const [h, m] = t.split(':').map(Number);
    const mins = (h || 0) * 60 + (m || 0);
    return mins >= 9 * 60 && mins <= 21 * 60;
}, { message: 'Appointment time must be between 09:00 AM and 9:00 PM (09:00 – 21:00)' }));
exports.createAppointmentSchema = zod_1.z.object({
    clientId: zod_1.z.string({ required_error: 'clientId is required' }).uuid('Invalid clientId UUID'),
    appointmentDate: zod_1.z.string({ required_error: 'appointmentDate is required' }).min(1, 'appointmentDate is required'),
    appointmentTime: exports.appointmentTimeSchema,
    mainTechnicianId: zod_1.z.string({ required_error: 'mainTechnicianId is required' }).uuid('Invalid mainTechnicianId UUID'),
    notes: zod_1.z.string().optional().nullable(),
    services: zod_1.z.array(exports.createAppointmentServiceItemSchema).min(1, 'At least one service is required'),
});
exports.updateAppointmentSchema = zod_1.z.object({
    appointmentDate: zod_1.z.string().optional(),
    appointmentTime: exports.appointmentTimeSchema.optional(),
    mainTechnicianId: zod_1.z.string().uuid().optional(),
    notes: zod_1.z.string().optional().nullable(),
    lateMinutes: zod_1.z.number().int().nonnegative().optional().nullable(),
    noShowReason: zod_1.z.string().optional().nullable(),
});
// CANCELLED is handled via a dedicated PATCH /:id/cancel endpoint, not through generic status change
exports.changeAppointmentStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        client_1.AppointmentStatus.SCHEDULED,
        client_1.AppointmentStatus.IN_PROGRESS,
        client_1.AppointmentStatus.COMPLETED,
        client_1.AppointmentStatus.LATE,
        client_1.AppointmentStatus.NO_SHOW,
    ], {
        required_error: 'Status must be one of: SCHEDULED, IN_PROGRESS, COMPLETED, LATE, NO_SHOW',
    }),
    notes: zod_1.z.string().optional().nullable(),
    lateMinutes: zod_1.z.number().int().nonnegative().optional().nullable(),
    noShowReason: zod_1.z.string().optional().nullable(),
});
exports.appointmentQuerySchema = zod_1.z.object({
    date: zod_1.z.string().optional(),
    technicianId: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.AppointmentStatus).optional(),
    clientId: zod_1.z.string().optional(),
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
//# sourceMappingURL=appointments.validation.js.map