import { z } from 'zod';

export const createSpecialtySchema = z.object({
  name: z.string().trim().min(1, 'Specialty name is required'),
  isActive: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const updateSpecialtySchema = z.object({
  name: z.string().trim().min(1, 'Specialty name cannot be empty').optional(),
  isActive: z.boolean().optional(),
  active: z.boolean().optional(),
});
