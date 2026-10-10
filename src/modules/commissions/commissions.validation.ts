import { z } from 'zod';
import { CommissionStatus } from '@prisma/client';

export const commissionQuerySchema = z.object({
  technicianId: z.string().uuid().optional(),
  status: z.nativeEnum(CommissionStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export const addBonusSchema = z.object({
  bonusAmount: z.number({ required_error: 'bonusAmount is required' }).positive('bonusAmount must be greater than 0'),
  reason: z.string().optional(),
});

export const adjustCommissionSchema = z.object({
  adjustedAmount: z.number().nonnegative('adjustedAmount cannot be negative').optional(),
  adjustedRate: z.number().positive('adjustedRate must be greater than 0').optional(),
  reason: z.string({ required_error: 'reason is required for commission adjustments' }).min(3, 'Reason must be at least 3 characters'),
});

export const setCommissionRuleSchema = z.object({
  serviceCategory: z.string({ required_error: 'serviceCategory is required' }).min(2),
  percentage: z.number({ required_error: 'percentage is required' }).positive('percentage must be positive'),
  fixedAmount: z.number().nonnegative().optional(),
});
