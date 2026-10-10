import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string({ required_error: 'Client name is required' }).min(1, 'Client name is required'),
  phone: z.string({ required_error: 'Phone number is required' }).min(1, 'Phone number is required'),
  whatsapp: z.string().optional().nullable(),
  quartier: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  anniversary: z.string().optional().nullable(),
  source: z.enum(['DIRECT', 'STAFF_REFERRAL', 'CLIENT_REFERRAL']).optional(),
  introducedByEmployeeId: z.string().uuid().optional().nullable(),
  referredByClientId: z.string().uuid().optional().nullable(),
  recommendedByName: z.string().optional().nullable(),
  recommendedByPhone: z.string().optional().nullable(),
});

export const updateClientSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  phone: z.string().min(1, 'Phone cannot be empty').optional(),
  whatsapp: z.string().optional().nullable(),
  quartier: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  anniversary: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'active', 'inactive']).optional(),
  isActive: z.boolean().optional(),
  lastServiceDate: z.string().optional().nullable(),
});

export const updateClientStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'active', 'inactive']).optional(),
  isActive: z.boolean().optional(),
});

export const addClientMediaSchema = z.object({
  mediaType: z.enum(['BEFORE', 'AFTER'], { required_error: 'mediaType must be BEFORE or AFTER' }),
  fileUrl: z.string({ required_error: 'fileUrl is required' }).min(1, 'fileUrl is required'),
  note: z.string().optional().nullable(),
});

export const clientQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  search: z.string().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'all', 'active', 'inactive']).optional(),
  isActive: z.union([z.boolean(), z.string()]).optional(),
});

