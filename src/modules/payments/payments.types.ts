import { PaymentMethod } from '@prisma/client';

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

export interface PaymentQueryFilter {
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
  date?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AuthContextUser {
  id: string;
  role: string;
}
