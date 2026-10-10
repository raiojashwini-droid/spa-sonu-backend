import { loyaltyService } from '../loyalty/loyalty.service';
import { commissionsService } from '../commissions/commissions.service';
import { PaymentMethod, InvoiceStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { RecordPaymentInput, PaymentQueryFilter, AuthContextUser } from './payments.types';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { logger } from '../../utils/logger';

export class PaymentsService {
  async recordPayment(data: RecordPaymentInput, authUser: AuthContextUser) {
    // 1. Fetch invoice with existing payments and client
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        payments: true,
        client: true,
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    }

    // 2. Reject if invoice is already fully paid
    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError('Invoice is already fully paid', HTTP_STATUS.BAD_REQUEST);
    }

    // 3. Calculate paid amount and remaining amount
    const paidSoFar = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = Math.max(0, Number(invoice.total) - paidSoFar);

    // 4. Overpayment check: Reject if payment exceeds remaining balance
    if (data.amount > remainingAmount) {
      throw new AppError(
        `Payment amount (${data.amount} FCFA) exceeds remaining balance (${remainingAmount} FCFA)`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const now = new Date();
    const newPaidTotal = paidSoFar + data.amount;
    const isFullyPaid = newPaidTotal >= Number(invoice.total);

    // 5. Create Payment record and update Invoice status in transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          receivedById: authUser.id,
          paidAt: now,
          notes: data.notes ? data.notes.trim() : null,
        },
        include: {
          receivedBy: {
            select: { id: true, email: true, staffProfile: { select: { name: true } } },
          },
        },
      });

      // Full payment -> automatically update invoice status = PAID
      if (isFullyPaid) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.PAID },
        });

        // Generate technician commissions upon invoice completion & payment
        await commissionsService.generateCommissionsForInvoice(invoice.id, tx);

        // Phase 19: Award loyalty points upon invoice PAID
        await loyaltyService.awardPointsForInvoice(invoice.id, tx);
      }

      // Log payment activity in ClientHistory
      if (invoice.clientId) {
        await tx.clientHistory.create({
          data: {
            clientId: invoice.clientId,
            action: 'PAYMENT_RECEIVED',
            details: `Payment of ${data.amount} FCFA received via ${data.paymentMethod} for Invoice ${invoice.invoiceNumber}. Remaining: ${Math.max(0, remainingAmount - data.amount)} FCFA`,
            performedBy: authUser.id,
          },
        });
      }

      return payment;
    });

    // Fire WhatsApp payment confirmation (non-blocking)
    if (isFullyPaid && invoice.clientId) {
      whatsappService.triggerPaymentConfirmation(invoice.id).catch((err: any) => {
        logger.warn('[Payments] WhatsApp payment confirmation trigger failed (non-blocking)', {
          invoiceId: invoice.id,
          error: err?.message || String(err),
        });
      });
    }

    return {
      payment: result,
      invoiceSummary: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: Number(invoice.total),
        paidAmount: newPaidTotal,
        remainingAmount: Math.max(0, Number(invoice.total) - newPaidTotal),
        status: isFullyPaid ? InvoiceStatus.PAID : invoice.status,
      },
    };
  }

  async getPayments(query: PaymentQueryFilter) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          invoice: {
            select: { id: true, invoiceNumber: true, total: true, status: true, clientId: true },
          },
          receivedBy: {
            select: { id: true, email: true, staffProfile: { select: { name: true } } },
          },
        },
      }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: { client: true },
        },
        receivedBy: {
          select: { id: true, email: true, staffProfile: { select: { name: true } } },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment not found', HTTP_STATUS.NOT_FOUND);
    }

    return payment;
  }
}

export const paymentsService = new PaymentsService();
