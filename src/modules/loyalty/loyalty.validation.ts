import { z } from 'zod';

export const updateLoyaltySettingsSchema = z.object({
  spendAmountForPoint: z.number().positive('spendAmountForPoint must be positive').optional(),
  pointsPerSpend: z.number().int().positive('pointsPerSpend must be positive integer').optional(),
  pointsForDiscount: z.number().int().positive('pointsForDiscount must be positive integer').optional(),
  discountAmount: z.number().positive('discountAmount must be positive').optional(),
  minPointsToRedeem: z.number().int().nonnegative('minPointsToRedeem must be non-negative integer').optional(),
  birthdayRewardPoints: z.number().int().positive('birthdayRewardPoints must be positive integer').optional(),
  anniversaryRewardPoints: z.number().int().positive('anniversaryRewardPoints must be positive integer').optional(),
  pointsExpiryEnabled: z.boolean().optional(),
  expiryDays: z.number().int().positive().optional(),
  servicePoints: z.record(z.string(), z.number()).optional(),
});

export const adjustPointsSchema = z.object({
  pointsDelta: z.number().int({ message: 'pointsDelta must be an integer' }),
  reason: z.string({ required_error: 'reason is required for points adjustment' }).min(3, 'Reason must be at least 3 characters'),
});

export const redeemPointsSchema = z.object({
  pointsToRedeem: z.number({ required_error: 'pointsToRedeem is required' }).int().positive('pointsToRedeem must be a positive integer'),
});

export const awardRewardSchema = z.object({
  rewardType: z.enum(['BIRTHDAY', 'ANNIVERSARY'], { required_error: 'rewardType must be BIRTHDAY or ANNIVERSARY' }),
  points: z.number().int().positive('points must be positive integer').optional(),
  note: z.string().optional(),
});

export const rebookingQuerySchema = z.object({
  status: z.enum(['DUE', 'OVERDUE', 'LAPSED']).optional(),
  daysInactive: z.union([z.string(), z.number()]).optional(),
  quartier: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});
