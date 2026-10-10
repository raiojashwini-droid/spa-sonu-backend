import { z } from 'zod';
import { MediaType } from '@prisma/client';

export const serviceMediaItemSchema = z.object({
  mediaType: z.nativeEnum(MediaType, { required_error: 'mediaType must be BEFORE or AFTER' }),
  fileUrl: z.string({ required_error: 'fileUrl is required' }).min(1, 'fileUrl cannot be empty'),
  note: z.string().optional().nullable(),
});

export const completeServiceSchema = z.object({
  notes: z.string().optional().nullable(),
  media: z.array(serviceMediaItemSchema).optional(),
});
