import { InvoiceStatus, InvoiceItemType, PaymentMethod } from '@prisma/client';

export interface CreateInvoiceInput {
  appointmentId?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string | null;
  phone?: string | null;
  date?: string | Date;
  invoiceNumber?: string;
  discount?: number;
  status?: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  payments?: {
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }[];
  retailProducts?: {
    retailProductId: string;
    quantity: number;
  }[];
  services?: {
    serviceId?: string | null;
    name?: string | null;
    service?: string | null;
    price: number;
    technicianId?: string | null;
    technician?: string | null;
    quantity?: number;
  }[];
}

export interface AddInvoiceItemInput {
  itemType: InvoiceItemType;
  retailProductId?: string;
  name?: string;
  price?: number;
  quantity: number;
}

export interface UpdateInvoiceInput {
  discount?: number;
  status?: InvoiceStatus;
  pointsRedeemed?: number;
  pointsEarned?: number;
}

export interface InvoiceQueryFilter {
  status?: InvoiceStatus;
  date?: string;
  clientId?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AuthContextUser {
  id: string;
  role: string;
}
