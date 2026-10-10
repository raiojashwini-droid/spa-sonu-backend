import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().optional().nullable(),
  username: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  password: z.string().optional(),
  specialties: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Valid email address is required').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  username: z.string().optional(),
  role: z.string().optional(),
  password: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
