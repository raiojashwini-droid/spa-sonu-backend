import { Prisma } from '@prisma/client';
import { UpdateLoyaltySettingsInput, AdjustPointsInput, RedeemPointsInput, AwardRewardInput, RebookingQueryFilter, AuthContextUser } from './loyalty.types';
export declare class LoyaltyService {
    /**
     * Fetch active loyalty program settings or initialize default settings if none exist.
     */
    getSettings(): Promise<{
        spendAmountForPoint: number;
        discountAmount: number;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        pointsPerSpend: number;
        pointsForDiscount: number;
        minPointsToRedeem: number;
        birthdayRewardPoints: number;
        anniversaryRewardPoints: number;
        pointsExpiryEnabled: boolean;
        expiryDays: number | null;
        servicePoints: Prisma.JsonValue | null;
    }>;
    /**
     * Manager updates loyalty program settings.
     */
    updateSettings(input: UpdateLoyaltySettingsInput): Promise<{
        spendAmountForPoint: number;
        discountAmount: number;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        pointsPerSpend: number;
        pointsForDiscount: number;
        minPointsToRedeem: number;
        birthdayRewardPoints: number;
        anniversaryRewardPoints: number;
        pointsExpiryEnabled: boolean;
        expiryDays: number | null;
        servicePoints: Prisma.JsonValue | null;
    }>;
    /**
     * Calculates and credits loyalty points to client when an invoice is fully PAID.
     * - Only awards points if invoice.status === PAID.
     * - Idempotent: Does NOT award duplicate points for the same invoice.
     * - Updates Client.lastVisitAt.
     */
    awardPointsForInvoice(invoiceId: string, txClient?: Prisma.TransactionClient): Promise<void>;
    /**
     * Get client's loyalty profile, current balance, totals, and transaction history.
     */
    getClientLoyalty(clientId: string): Promise<{
        client: {
            id: string;
            phone: string;
            name: string;
            birthday: Date | null;
            anniversary: Date | null;
            lastVisitAt: Date | null;
        };
        balance: number;
        totalEarned: number;
        totalRedeemed: number;
        history: ({
            invoice: {
                id: string;
                total: Prisma.Decimal;
                invoiceNumber: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.LoyaltyTransactionType;
            source: string | null;
            clientId: string;
            date: Date;
            invoiceId: string | null;
            points: number;
            balanceAfter: number;
        })[];
    }>;
    /**
     * Manager manually adjusts client loyalty points with mandatory reason.
     */
    adjustClientPoints(clientId: string, input: AdjustPointsInput, authUser: AuthContextUser): Promise<{
        balance: number;
        pointsDelta: number;
        transaction: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.LoyaltyTransactionType;
            source: string | null;
            clientId: string;
            date: Date;
            invoiceId: string | null;
            points: number;
            balanceAfter: number;
        };
    }>;
    /**
     * Redeem loyalty points during invoicing for a direct discount.
     */
    redeemPointsForInvoice(invoiceId: string, input: RedeemPointsInput, authUser: AuthContextUser): Promise<{
        invoice: {
            id: string;
            invoiceNumber: string;
            subtotal: number;
            discount: number;
            total: number;
            pointsRedeemed: number;
        };
        pointsRedeemed: number;
        discountApplied: number;
        remainingBalance: number;
    }>;
    /**
     * Award birthday or anniversary celebration reward points to a client.
     */
    awardCelebrationReward(clientId: string, input: AwardRewardInput, authUser: AuthContextUser): Promise<{
        client: {
            id: string;
            name: string;
        };
        rewardType: "BIRTHDAY" | "ANNIVERSARY";
        pointsAwarded: number;
        newBalance: number;
        transaction: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.LoyaltyTransactionType;
            source: string | null;
            clientId: string;
            date: Date;
            invoiceId: string | null;
            points: number;
            balanceAfter: number;
        };
    }>;
    /**
     * Returns list of clients with birthdays or anniversaries in the upcoming window (e.g. 30 days).
     */
    getUpcomingCelebrations(daysAhead?: number): Promise<{
        celebrations: any[];
    }>;
    /**
     * Customer Retention: Rebooking tracking
     * Identifies clients due for rebooking:
     * - DUE: 21 to 44 days since last visit
     * - OVERDUE: 45 to 89 days since last visit
     * - LAPSED: 90+ days since last visit
     * Excludes clients who already have an upcoming scheduled/in-progress appointment.
     */
    getRebookingClients(query: RebookingQueryFilter): Promise<{
        clients: any[];
        summary: {
            totalDue: number;
            totalOverdue: number;
            totalLapsed: number;
            totalActionable: number;
        };
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
export declare const loyaltyService: LoyaltyService;
//# sourceMappingURL=loyalty.service.d.ts.map