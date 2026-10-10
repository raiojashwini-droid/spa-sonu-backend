import { z } from 'zod';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

export const createExpenseSchema = z.object({
  date: z.string().optional().default(() => new Date().toISOString().slice(0, 10)),
  category: z.preprocess((val) => {
    if (typeof val === 'string') {
      const formatted = val.toUpperCase().replace(/\s+/g, '_').replace(/[\/\-]/g, '_');
      if (formatted.includes('GENERATOR')) return ExpenseCategory.GENERATOR_FUEL;
      if (formatted in ExpenseCategory) return formatted;
    }
    return val;
  }, z.nativeEnum(ExpenseCategory)),
  amount: z.coerce.number().positive('Expense amount must be greater than 0'),
  paymentMethod: z.preprocess((val) => {
    if (typeof val === 'string') {
      const formatted = val.toUpperCase().replace(/\s+/g, '_');
      if (formatted === 'MTN_MOMO' || formatted === 'MTNMOMO' || formatted === 'MOMO') return PaymentMethod.MTN_MOMO;
      if (formatted === 'ORANGE_MONEY' || formatted === 'ORANGEMONEY' || formatted === 'OM') return PaymentMethod.ORANGE_MONEY;
      if (formatted === 'CASH') return PaymentMethod.CASH;
    }
    return val;
  }, z.nativeEnum(PaymentMethod)),
  note: z.string({ required_error: 'Expense reason/note is required' }).trim().min(1, 'Please enter the reason for this expense'),
});

export const expenseQuerySchema = z.object({
  date: z.string().optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
