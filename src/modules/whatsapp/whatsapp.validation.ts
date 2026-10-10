import { z } from 'zod';
import { WhatsAppAutomationType, WhatsAppMessageStatus } from './whatsapp.types';

export const updateAutomationSchema = z.object({
  template: z.string().min(1, 'Template cannot be empty').optional(),
  isActive: z.boolean().optional(),
  enabled: z.boolean().optional(),
  timing: z.string().nullable().optional(),
  scheduleTime: z.string().nullable().optional(),
});

export const sendCustomMessageSchema = z.object({
  recipientPhone: z.string().min(6, 'Valid recipient phone is required'),
  message: z.string().min(1, 'Message text is required'),
  clientId: z.string().optional(),
  appointmentId: z.string().optional(),
  invoiceId: z.string().optional(),
  automationType: z.nativeEnum(WhatsAppAutomationType).optional(),
  idempotencyKey: z.string().optional(),
});

export const dailyCloseTriggerSchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  recipientPhone: z.string().optional(),
});

export const processRemindersQuerySchema = z.object({
  date: z.string().optional(),
});

export const logsQuerySchema = z.object({
  status: z.nativeEnum(WhatsAppMessageStatus).optional(),
  automationType: z.nativeEnum(WhatsAppAutomationType).optional(),
  clientId: z.string().optional(),
  appointmentId: z.string().optional(),
  invoiceId: z.string().optional(),
  phone: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
