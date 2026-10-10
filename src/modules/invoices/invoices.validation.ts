import { z } from 'zod';
import { InvoiceStatus, InvoiceItemType } from '@prisma/client';

export const createInvoiceSchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === 'object') {
      if (val.appointmentId && typeof val.appointmentId === 'object') {
        const nested = val.appointmentId;
        return {
          ...nested,
          ...val,
          appointmentId: nested.appointmentId || nested.id || String(nested),
        };
      }
    }
    return val;
  },
  z
    .object({
      appointmentId: z.string().uuid('Invalid appointmentId UUID').optional().nullable(),
      clientId: z.string().uuid('Invalid clientId UUID').optional().nullable(),
      clientName: z.string().optional().nullable(),
      discount: z.number().nonnegative('Discount cannot be negative').optional().default(0),
      status: z.enum([InvoiceStatus.DRAFT, InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.PAID]).optional().default(InvoiceStatus.PENDING_PAYMENT),
      paymentMethod: z.enum(['CASH', 'MTN_MOMO', 'ORANGE_MONEY']).optional(),
      retailProducts: z
        .array(
          z.object({
            retailProductId: z.string().uuid('Invalid retailProductId UUID'),
            quantity: z.number().int().positive('Quantity must be a positive integer'),
          })
        )
        .optional(),
    })
    .refine((data) => Boolean(data.appointmentId || (data.retailProducts && data.retailProducts.length > 0)), {
      message: 'Either appointmentId or at least one retailProduct must be provided',
    })
);

export const addInvoiceItemSchema = z.object({
  itemType: z.nativeEnum(InvoiceItemType).optional().default(InvoiceItemType.RETAIL_PRODUCT),
  retailProductId: z.string().uuid().optional(),
  name: z.string().optional(),
  price: z.number().nonnegative().optional(),
  quantity: z.number().int().positive('Quantity must be at least 1').default(1),
});

export const updateInvoiceSchema = z.object({
  discount: z.number().nonnegative('Discount cannot be negative').optional(),
  status: z.enum([InvoiceStatus.DRAFT, InvoiceStatus.PENDING_PAYMENT]).optional(),
});

export const invoiceQuerySchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  date: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});
