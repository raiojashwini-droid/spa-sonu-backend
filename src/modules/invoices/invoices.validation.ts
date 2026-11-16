import { z } from 'zod';
import { InvoiceStatus, InvoiceItemType } from '@prisma/client';

export const createInvoiceSchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === 'object') {
      const sanitized = { ...val };
      if (sanitized.appointmentId && typeof sanitized.appointmentId === 'object') {
        const nested = sanitized.appointmentId;
        sanitized.appointmentId = nested.appointmentId || nested.id || String(nested);
      }
      if (sanitized.clientId && typeof sanitized.clientId === 'string') {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sanitized.clientId);
        if (!isUuid) {
          sanitized.clientId = null;
        }
      }
      return sanitized;
    }
    return val;
  },
  z
    .object({
      appointmentId: z.string().uuid('Invalid appointmentId UUID').optional().nullable(),
      clientId: z.string().uuid('Invalid clientId UUID').optional().nullable(),
      clientName: z.string().optional().nullable(),
      clientPhone: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      date: z.union([z.string(), z.date()]).optional().nullable(),
      invoiceNumber: z.string().optional().nullable(),
      discount: z.number().nonnegative('Discount cannot be negative').optional().default(0),
      status: z.enum([InvoiceStatus.DRAFT, InvoiceStatus.PENDING_PAYMENT, InvoiceStatus.PAID]).optional().default(InvoiceStatus.PENDING_PAYMENT),
      paymentMethod: z.enum(['CASH', 'MTN_MOMO', 'ORANGE_MONEY']).optional(),
      payments: z
        .array(
          z.object({
            amount: z.number().positive('Payment amount must be greater than 0'),
            paymentMethod: z.enum(['CASH', 'MTN_MOMO', 'ORANGE_MONEY']),
            notes: z.string().optional().nullable(),
          })
        )
        .optional(),
      retailProducts: z
        .array(
          z.object({
            retailProductId: z.string().uuid('Invalid retailProductId UUID'),
            quantity: z.number().int().positive('Quantity must be a positive integer'),
          })
        )
        .optional(),
      services: z
        .array(
          z.object({
            serviceId: z.string().optional().nullable(),
            name: z.string().optional().nullable(),
            service: z.string().optional().nullable(),
            price: z.number().nonnegative(),
            technicianId: z.string().optional().nullable(),
            technician: z.string().optional().nullable(),
            quantity: z.number().int().positive().optional().default(1),
          })
        )
        .optional(),
    })
    .refine(
      (data) =>
        Boolean(
          data.appointmentId ||
            (data.retailProducts && data.retailProducts.length > 0) ||
            (data.services && data.services.length > 0)
        ),
      {
        message: 'Either appointmentId, retailProducts, or services must be provided',
      }
    )
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
  pointsRedeemed: z.number().int().nonnegative().optional(),
  pointsEarned: z.number().int().nonnegative().optional(),
});

export const invoiceQuerySchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  date: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});
