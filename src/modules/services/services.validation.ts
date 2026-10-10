import { z } from 'zod';
import { ServiceStatus } from '@prisma/client';

export const createServiceSchema = z.object({
  name: z.string({ required_error: 'Service name is required' }).trim().min(1, 'Service name cannot be empty'),
  category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category cannot be empty'),
  description: z.string().trim().optional().nullable(),
  duration: z.coerce.number().int().positive('Duration must be greater than 0'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  status: z.nativeEnum(ServiceStatus).optional().default(ServiceStatus.ACTIVE),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1, 'Service name cannot be empty').optional(),
  category: z.string().trim().min(1, 'Category cannot be empty').optional(),
  description: z.string().trim().optional().nullable(),
  duration: z.coerce.number().int().positive('Duration must be greater than 0').optional(),
  price: z.coerce.number().positive('Price must be greater than 0').optional(),
  status: z.nativeEnum(ServiceStatus).optional(),
});

export const serviceQuerySchema = z.object({
  category: z.string().optional(),
  status: z.nativeEnum(ServiceStatus).optional(),
  search: z.string().optional(),
});
