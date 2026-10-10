import { ExpenseCategory, PaymentMethod } from '@prisma/client';

export interface CreateExpenseInput {
  date: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  note: string;
}

export interface ExpenseQueryFilter {
  date?: string;
  category?: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
}
