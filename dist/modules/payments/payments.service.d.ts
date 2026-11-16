import { RecordPaymentInput, PaymentQueryFilter, AuthContextUser } from './payments.types';
export declare class PaymentsService {
    recordPayment(data: RecordPaymentInput, authUser: AuthContextUser): Promise<{
        payment: {
            receivedBy: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            invoiceId: string;
            paidAt: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            receivedById: string;
        };
        invoiceSummary: {
            id: string;
            invoiceNumber: string;
            total: number;
            paidAmount: number;
            remainingAmount: number;
            status: "DRAFT" | "PENDING_PAYMENT" | "PAID";
        };
    }>;
    getPayments(query: PaymentQueryFilter): Promise<{
        payments: ({
            invoice: {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                clientId: string | null;
                total: import("@prisma/client/runtime/library").Decimal;
                invoiceNumber: string;
            };
            receivedBy: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            invoiceId: string;
            paidAt: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            receivedById: string;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getPaymentById(id: string): Promise<{
        invoice: {
            client: {
                id: string;
                phone: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                status: string;
                whatsapp: string | null;
                quartier: string | null;
                birthday: Date | null;
                anniversary: Date | null;
                source: import(".prisma/client").$Enums.ClientSource;
                introducedByEmployeeId: string | null;
                referredByClientId: string | null;
                recommendedByName: string | null;
                recommendedByPhone: string | null;
                recommendedByDate: Date | null;
                firstAppointmentService: string | null;
                noShowCount: number;
                lastVisitAt: Date | null;
                lastServiceDate: Date | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            clientId: string | null;
            appointmentId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            clientName: string | null;
            invoiceNumber: string;
            clientPhone: string | null;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            pointsEarned: number;
            pointsRedeemed: number;
        };
        receivedBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        invoiceId: string;
        paidAt: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        receivedById: string;
    }>;
}
export declare const paymentsService: PaymentsService;
//# sourceMappingURL=payments.service.d.ts.map