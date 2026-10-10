import { z } from 'zod';

export const dateRangeQuerySchema = z.object({
  period: z.enum(['today', 'weekly', 'monthly', 'custom']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const topServicesQuerySchema = dateRangeQuerySchema.extend({
  limit: z.union([z.string(), z.number()]).optional(),
});

export const technicianReportQuerySchema = dateRangeQuerySchema.extend({
  technicianId: z.string().uuid().optional(),
});
