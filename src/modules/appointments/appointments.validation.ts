import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

export const createAppointmentServiceItemSchema = z.object({
  serviceId: z.string({ required_error: 'serviceId is required' }).uuid('Invalid serviceId UUID'),
  technicianId: z.string().uuid('Invalid technicianId UUID').optional(),
  price: z.number().positive('Price must be positive').optional(),
});

export const appointmentTimeSchema = z
  .string({ required_error: 'appointmentTime is required' })
  .transform((val) => {
    if (!val) return val;
    const clean = val.trim();
    // Convert 12-hour format e.g. "10:45 AM", "02:30 PM", "2:30 pm"
    const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const mins = match12[2];
      const period = match12[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
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
  .pipe(
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)')
      .refine(
        (t) => {
          const [h, m] = t.split(':').map(Number);
          const mins = (h || 0) * 60 + (m || 0);
          return mins >= 10 * 60 && mins <= 21 * 60;
        },
        { message: 'Appointment time must be between 10:00 AM and 9:00 PM (10:00 – 21:00)' }
      )
  );

export const createAppointmentSchema = z.object({
  clientId: z.string({ required_error: 'clientId is required' }).uuid('Invalid clientId UUID'),
  appointmentDate: z.string({ required_error: 'appointmentDate is required' }).min(1, 'appointmentDate is required'),
  appointmentTime: appointmentTimeSchema,
  mainTechnicianId: z.string({ required_error: 'mainTechnicianId is required' }).uuid('Invalid mainTechnicianId UUID'),
  notes: z.string().optional().nullable(),
  services: z.array(createAppointmentServiceItemSchema).min(1, 'At least one service is required'),
});

export const updateAppointmentSchema = z.object({
  appointmentDate: z.string().optional(),
  appointmentTime: appointmentTimeSchema.optional(),
  mainTechnicianId: z.string().uuid().optional(),
  notes: z.string().optional().nullable(),
  lateMinutes: z.number().int().nonnegative().optional().nullable(),
  noShowReason: z.string().optional().nullable(),
});

// CANCELLED is handled via a dedicated PATCH /:id/cancel endpoint, not through generic status change
export const changeAppointmentStatusSchema = z.object({
  status: z.enum([
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.LATE,
    AppointmentStatus.NO_SHOW,
  ], {
    required_error: 'Status must be one of: SCHEDULED, IN_PROGRESS, COMPLETED, LATE, NO_SHOW',
  }),
  notes: z.string().optional().nullable(),
  lateMinutes: z.number().int().nonnegative().optional().nullable(),
  noShowReason: z.string().optional().nullable(),
});

export const appointmentQuerySchema = z.object({
  date: z.string().optional(),
  technicianId: z.string().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  clientId: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});
