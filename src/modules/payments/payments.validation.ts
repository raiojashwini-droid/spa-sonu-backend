import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const recordPaymentSchema = z.object({
  invoiceId: z.string({ required_error: 'invoiceId is required' }).uuid('Invalid invoiceId UUID'),
  amount: z.number({ required_error: 'amount is required' }).positive('Payment amount must be greater than zero'),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    required_error: 'paymentMethod must be one of: CASH, MTN_MOMO, ORANGE_MONEY',
  }),
  notes: z.string().optional().nullable(),
});

export const paymentQuerySchema = z.object({
  invoiceId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  date: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});
