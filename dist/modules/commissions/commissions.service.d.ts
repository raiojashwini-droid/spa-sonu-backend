import { Prisma } from '@prisma/client';
import { CommissionQueryFilter, AddBonusInput, AdjustCommissionInput, SetCommissionRuleInput, AuthContextUser, SalarySummaryData } from './commissions.types';
export declare class CommissionsService {
    /**
     * Automatically calculates and generates technician commissions for a PAID invoice.
     * - Only executes if invoice status === PAID.
     * - Idempotent: Prevents duplicate commission generation.
     * - Calculates based on the actual technician assigned to each service item.
     * - Supports service-wise commission percentages.
     * - Also generates employee referral commissions if applicable.
     */
    generateCommissionsForInvoice(invoiceId: string, txClient?: Prisma.TransactionClient): Promise<void>;
    /**
     * Generates EmployeeCommission for the employee / marketer who introduced the client.
     * - Looks up client.introducedByEmployeeId from the invoice's client.
     * - For MARKETER:
     *   1. Flat Acquisition Fee: Awarded on the client's first paid visit/invoice.
     *   2. Lifetime Percentage: Earned on every service visit for life, deducted from the performing technician.
     * - For Other Staff: Standard referral commission rules.
     * - Idempotent: Skips if EmployeeCommission already exists for this invoice.
     * - The referring employee must NOT be a MANAGER (Managers cannot earn referral commissions).
     */
    private generateEmployeeReferralCommission;
    /**
     * Get commissions list with filtering, summary stats, and RBAC enforcement.
     * TECHNICIAN: Automatically scoped to their own commissions only.
     */
    getCommissions(query: CommissionQueryFilter, authUser: AuthContextUser): Promise<{
        commissions: {
            servicePrice: number;
            commissionRate: number;
            baseCommission: number;
            bonusAmount: number;
            totalCommission: number;
            activities: {
                amount: number;
                previousTotal: number | null;
                newTotal: number | null;
                performedBy: {
                    staffProfile: {
                        name: string;
                    } | null;
                    id: string;
                    email: string;
                } | null;
                id: string;
                createdAt: Date;
                type: import(".prisma/client").$Enums.CommissionActivityType;
                reason: string | null;
                technicianCommissionId: string;
                performedById: string | null;
            }[];
            invoice: {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                total: Prisma.Decimal;
                date: Date;
                invoiceNumber: string;
            };
            technician: {
                staffProfile: {
                    phone: string | null;
                    name: string;
                } | null;
                id: string;
                email: string;
            };
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.CommissionStatus;
            notes: string | null;
            serviceId: string | null;
            technicianId: string;
            invoiceId: string;
            appointmentServiceId: string | null;
            serviceCategory: string | null;
            serviceName: string;
            referralDeduction: Prisma.Decimal;
            approvedAt: Date | null;
            employeeCommissionId: string | null;
            approvedById: string | null;
        }[];
        summary: {
            totalBaseCommission: number;
            totalBonusAmount: number;
            totalEarned: number;
            totalApproved: number;
            totalPending: number;
        };
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Get specific technician commission report.
     * TECHNICIAN: Blocked with 403 Forbidden if requesting another technician's report.
     */
    getTechnicianCommissions(technicianId: string, query: CommissionQueryFilter, authUser: AuthContextUser): Promise<{
        commissions: {
            servicePrice: number;
            commissionRate: number;
            baseCommission: number;
            bonusAmount: number;
            totalCommission: number;
            activities: {
                amount: number;
                previousTotal: number | null;
                newTotal: number | null;
                performedBy: {
                    staffProfile: {
                        name: string;
                    } | null;
                    id: string;
                    email: string;
                } | null;
                id: string;
                createdAt: Date;
                type: import(".prisma/client").$Enums.CommissionActivityType;
                reason: string | null;
                technicianCommissionId: string;
                performedById: string | null;
            }[];
            invoice: {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                total: Prisma.Decimal;
                date: Date;
                invoiceNumber: string;
            };
            technician: {
                staffProfile: {
                    phone: string | null;
                    name: string;
                } | null;
                id: string;
                email: string;
            };
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.CommissionStatus;
            notes: string | null;
            serviceId: string | null;
            technicianId: string;
            invoiceId: string;
            appointmentServiceId: string | null;
            serviceCategory: string | null;
            serviceName: string;
            referralDeduction: Prisma.Decimal;
            approvedAt: Date | null;
            employeeCommissionId: string | null;
            approvedById: string | null;
        }[];
        summary: {
            totalBaseCommission: number;
            totalBonusAmount: number;
            totalEarned: number;
            totalApproved: number;
            totalPending: number;
        };
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        technician: {
            id: string;
            email: string;
            name: string;
            phone: string | null;
        };
    }>;
    /**
     * Manager adds a performance bonus to a technician's commission record.
     * Logs CommissionActivity with BONUS_ADDED.
     */
    addBonus(commissionId: string, input: AddBonusInput, authUser: AuthContextUser): Promise<{
        servicePrice: number;
        commissionRate: number;
        baseCommission: number;
        bonusAmount: number;
        totalCommission: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.CommissionStatus;
        notes: string | null;
        serviceId: string | null;
        technicianId: string;
        invoiceId: string;
        appointmentServiceId: string | null;
        serviceCategory: string | null;
        serviceName: string;
        referralDeduction: Prisma.Decimal;
        approvedAt: Date | null;
        employeeCommissionId: string | null;
        approvedById: string | null;
    }>;
    /**
     * Manager adjusts commission amount or rate with mandatory reason.
     * Logs CommissionActivity with ADJUSTED.
     */
    adjustCommission(commissionId: string, input: AdjustCommissionInput, authUser: AuthContextUser): Promise<{
        servicePrice: number;
        commissionRate: number;
        baseCommission: number;
        bonusAmount: number;
        totalCommission: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.CommissionStatus;
        notes: string | null;
        serviceId: string | null;
        technicianId: string;
        invoiceId: string;
        appointmentServiceId: string | null;
        serviceCategory: string | null;
        serviceName: string;
        referralDeduction: Prisma.Decimal;
        approvedAt: Date | null;
        employeeCommissionId: string | null;
        approvedById: string | null;
    }>;
    /**
     * Manager approves commission record.
     * Logs CommissionActivity with APPROVED.
     */
    approveCommission(commissionId: string, authUser: AuthContextUser): Promise<{
        servicePrice: number;
        commissionRate: number;
        baseCommission: number;
        bonusAmount: number;
        totalCommission: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.CommissionStatus;
        notes: string | null;
        serviceId: string | null;
        technicianId: string;
        invoiceId: string;
        appointmentServiceId: string | null;
        serviceCategory: string | null;
        serviceName: string;
        referralDeduction: Prisma.Decimal;
        approvedAt: Date | null;
        employeeCommissionId: string | null;
        approvedById: string | null;
    }>;
    /**
     * Manager sets/updates service-wise commission rules.
     */
    setCommissionRule(input: SetCommissionRuleInput): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.CommissionType;
        percentage: Prisma.Decimal;
        fixedAmount: Prisma.Decimal | null;
        serviceCategory: string | null;
    }>;
    getCommissionRules(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.CommissionType;
        percentage: Prisma.Decimal;
        fixedAmount: Prisma.Decimal | null;
        serviceCategory: string | null;
    }[]>;
    /**
     * Retrieves Authoritative Monthly Salary & Target Summary for an employee.
     * Dynamically evaluates Mode A (Fixed Salary) vs Mode B (Base Pay + Commission).
     * Implements minimum floor guarantee max(S_fixed, Base + Net Commission).
     */
    getSalarySummary(technicianId: string, period?: string): Promise<SalarySummaryData>;
    /**
     * Finalizes and freezes a month's payroll record for an employee.
     * - Must be Manager role.
     * - Immutability guard: if record is already finalized, returns 403 Forbidden.
     * - Freezes authoritative snapshot into MonthlyPayrollRecord.
     */
    finalizeMonthlyPayroll(employeeId: string, period: string, finalizedById: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        targetScope: string;
        employeeId: string;
        periodYearMonth: string;
        targetQuota: Prisma.Decimal;
        actualRevenue: Prisma.Decimal;
        isTargetMet: boolean;
        salaryMode: string;
        fixedSalaryAmount: Prisma.Decimal;
        basePayAmount: Prisma.Decimal;
        grossCommission: Prisma.Decimal;
        referralDeductions: Prisma.Decimal;
        netCommission: Prisma.Decimal;
        finalPayoutAmount: Prisma.Decimal;
        isFinalized: boolean;
        finalizedById: string | null;
        finalizedAt: Date | null;
    }>;
    /**
     * Authoritative Marketer Performance and Commission Ledger Report
     * Returns:
     * - Marketer profile and contract rates
     * - Total introduced clients count
     * - First-visit new clients acquired (bounties earned)
     * - Repeat visits and lifetime percentage commissions
     * - Detailed list of introduced clients and their visits
     */
    getMarketerPerformance(marketerId: string, authUser: AuthContextUser): Promise<{
        marketer: {
            id: string;
            email: string;
            name: string;
            phone: string | null;
            contract: {
                negotiatedPercentage: number;
                flatAcquisitionFee: number;
            };
        };
        metrics: {
            totalClientsIntroduced: number;
            clientsWithPaidVisits: number;
            totalVisitsCount: number;
            totalCommissionEarned: number;
            totalApprovedCommission: number;
            totalPendingCommission: number;
        };
        commissions: {
            id: string;
            invoiceId: string;
            invoiceNumber: string;
            invoiceDate: Date;
            clientName: string | undefined;
            amount: number;
            status: import(".prisma/client").$Enums.CommissionStatus;
            createdAt: Date;
            technicianSplits: {
                technicianName: string;
                serviceName: string;
                servicePrice: number;
                deductionFromTech: number;
            }[];
        }[];
        clients: {
            id: string;
            name: string;
            phone: string;
            totalVisits: number;
            totalSpent: number;
            firstVisitDate: Date;
            lastVisitDate: Date;
        }[];
    }>;
}
export declare const commissionsService: CommissionsService;
//# sourceMappingURL=commissions.service.d.ts.map