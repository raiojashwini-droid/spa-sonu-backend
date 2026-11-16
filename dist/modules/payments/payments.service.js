"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsService = exports.PaymentsService = void 0;
const loyalty_service_1 = require("../loyalty/loyalty.service");
const commissions_service_1 = require("../commissions/commissions.service");
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const logger_1 = require("../../utils/logger");
class PaymentsService {
    async recordPayment(data, authUser) {
        // 1. Fetch invoice with existing payments and client
        const invoice = await database_1.default.invoice.findUnique({
            where: { id: data.invoiceId },
            include: {
                payments: true,
                client: true,
            },
        });
        if (!invoice) {
            throw new errorHandler_1.AppError('Invoice not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // 2. Reject if invoice is already fully paid
        if (invoice.status === client_1.InvoiceStatus.PAID) {
            throw new errorHandler_1.AppError('Invoice is already fully paid', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 3. Calculate paid amount and remaining amount
        const paidSoFar = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remainingAmount = Math.max(0, Number(invoice.total) - paidSoFar);
        // 4. Overpayment check: Reject if payment exceeds remaining balance
        if (data.amount > remainingAmount) {
            throw new errorHandler_1.AppError(`Payment amount (${data.amount} FCFA) exceeds remaining balance (${remainingAmount} FCFA)`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const now = new Date();
        const newPaidTotal = paidSoFar + data.amount;
        const isFullyPaid = newPaidTotal >= Number(invoice.total);
        // 5. Create Payment record and update Invoice status in transaction
        const result = await database_1.default.$transaction(async (tx) => {
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
                    data: { status: client_1.InvoiceStatus.PAID },
                });
                // Generate technician commissions upon invoice completion & payment
                await commissions_service_1.commissionsService.generateCommissionsForInvoice(invoice.id, tx);
                // Phase 19: Award loyalty points upon invoice PAID
                await loyalty_service_1.loyaltyService.awardPointsForInvoice(invoice.id, tx);
                // Update Client lastVisitAt
                if (invoice.clientId) {
                    await tx.client.update({
                        where: { id: invoice.clientId },
                        data: { lastVisitAt: new Date() },
                    });
                }
                else if (invoice.clientPhone) {
                    const matchedClient = await tx.client.findFirst({
                        where: {
                            OR: [
                                { phone: invoice.clientPhone },
                                { whatsapp: invoice.clientPhone },
                            ],
                        },
                    });
                    if (matchedClient) {
                        await tx.client.update({
                            where: { id: matchedClient.id },
                            data: { lastVisitAt: new Date() },
                        });
                    }
                }
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
        // Fire WhatsApp feedback link on payment collect (non-blocking)
        if (isFullyPaid && (invoice.clientId || invoice.clientPhone)) {
            whatsapp_service_1.whatsappService.sendInvoiceFeedback(invoice.id).catch((err) => {
                logger_1.logger.warn('[Payments] WhatsApp feedback link trigger failed (non-blocking)', {
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
                status: isFullyPaid ? client_1.InvoiceStatus.PAID : invoice.status,
            },
        };
    }
    async getPayments(query) {
        const page = Math.max(1, parseInt(String(query.page || 1), 10));
        const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.invoiceId)
            where.invoiceId = query.invoiceId;
        if (query.paymentMethod)
            where.paymentMethod = query.paymentMethod;
        const [total, payments] = await Promise.all([
            database_1.default.payment.count({ where }),
            database_1.default.payment.findMany({
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
    async getPaymentById(id) {
        const payment = await database_1.default.payment.findUnique({
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
            throw new errorHandler_1.AppError('Payment not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return payment;
    }
}
exports.PaymentsService = PaymentsService;
exports.paymentsService = new PaymentsService();
//# sourceMappingURL=payments.service.js.map