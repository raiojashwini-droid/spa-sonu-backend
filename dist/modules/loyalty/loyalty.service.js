"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loyaltyService = exports.LoyaltyService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class LoyaltyService {
    /**
     * Fetch active loyalty program settings or initialize default settings if none exist.
     */
    async getSettings() {
        let setting = await database_1.default.loyaltySetting.findFirst({
            where: { isActive: true },
        });
        if (!setting) {
            setting = await database_1.default.loyaltySetting.create({
                data: {
                    spendAmountForPoint: new client_1.Prisma.Decimal(1000),
                    pointsPerSpend: 1,
                    pointsForDiscount: 100,
                    discountAmount: new client_1.Prisma.Decimal(1000),
                    minPointsToRedeem: 100,
                    birthdayRewardPoints: 50,
                    anniversaryRewardPoints: 50,
                    pointsExpiryEnabled: false,
                    expiryDays: 365,
                    isActive: true,
                },
            });
        }
        return {
            ...setting,
            spendAmountForPoint: Number(setting.spendAmountForPoint),
            discountAmount: Number(setting.discountAmount),
        };
    }
    /**
     * Manager updates loyalty program settings.
     */
    async updateSettings(input) {
        const current = await this.getSettings();
        const data = {};
        if (input.spendAmountForPoint !== undefined)
            data.spendAmountForPoint = new client_1.Prisma.Decimal(input.spendAmountForPoint);
        if (input.pointsPerSpend !== undefined)
            data.pointsPerSpend = input.pointsPerSpend;
        if (input.pointsForDiscount !== undefined)
            data.pointsForDiscount = input.pointsForDiscount;
        if (input.discountAmount !== undefined)
            data.discountAmount = new client_1.Prisma.Decimal(input.discountAmount);
        if (input.minPointsToRedeem !== undefined)
            data.minPointsToRedeem = input.minPointsToRedeem;
        if (input.birthdayRewardPoints !== undefined)
            data.birthdayRewardPoints = input.birthdayRewardPoints;
        if (input.anniversaryRewardPoints !== undefined)
            data.anniversaryRewardPoints = input.anniversaryRewardPoints;
        if (input.pointsExpiryEnabled !== undefined)
            data.pointsExpiryEnabled = input.pointsExpiryEnabled;
        if (input.expiryDays !== undefined)
            data.expiryDays = input.expiryDays;
        if (input.servicePoints !== undefined)
            data.servicePoints = input.servicePoints;
        const updated = await database_1.default.loyaltySetting.update({
            where: { id: current.id },
            data,
        });
        return {
            ...updated,
            spendAmountForPoint: Number(updated.spendAmountForPoint),
            discountAmount: Number(updated.discountAmount),
        };
    }
    /**
     * Calculates and credits loyalty points to client when an invoice is fully PAID.
     * - Only awards points if invoice.status === PAID.
     * - Idempotent: Does NOT award duplicate points for the same invoice.
     * - Updates Client.lastVisitAt.
     */
    async awardPointsForInvoice(invoiceId, txClient) {
        const client = txClient || database_1.default;
        const invoice = await client.invoice.findUnique({
            where: { id: invoiceId },
        });
        if (!invoice || !invoice.clientId)
            return;
        // Requirement: Points earned ONLY after invoice PAID
        if (invoice.status !== client_1.InvoiceStatus.PAID) {
            return;
        }
        // Idempotency check: verify if points already awarded for this invoice
        const existingTx = await client.loyaltyTransaction.findFirst({
            where: {
                invoiceId,
                type: client_1.LoyaltyTransactionType.EARN,
            },
        });
        if (existingTx) {
            return; // Already awarded
        }
        const setting = await this.getSettings();
        const servicePointsRule = setting.servicePoints || {};
        // Check invoice items for any services that have custom service points
        const invoiceItems = await client.invoiceItem.findMany({
            where: { invoiceId, itemType: 'SERVICE' },
        });
        let serviceBonusPoints = 0;
        let hasCustomServiceRule = false;
        if (servicePointsRule && typeof servicePointsRule === 'object' && Object.keys(servicePointsRule).length > 0 && invoiceItems.length > 0) {
            for (const item of invoiceItems) {
                if (item.name && servicePointsRule[item.name] !== undefined) {
                    serviceBonusPoints += Number(servicePointsRule[item.name]) * (item.quantity || 1);
                    hasCustomServiceRule = true;
                }
            }
        }
        const eligibleAmount = Number(invoice.total);
        const spendingPoints = Math.floor(eligibleAmount / setting.spendAmountForPoint) * setting.pointsPerSpend;
        const pointsToEarn = hasCustomServiceRule ? serviceBonusPoints : spendingPoints;
        if (pointsToEarn <= 0)
            return;
        // Fetch or create ClientLoyalty
        const currentLoyalty = await client.clientLoyalty.findUnique({
            where: { clientId: invoice.clientId },
        });
        const currentBalance = currentLoyalty ? currentLoyalty.balance : 0;
        const currentEarned = currentLoyalty ? currentLoyalty.totalEarned : 0;
        const newBalance = currentBalance + pointsToEarn;
        const newTotalEarned = currentEarned + pointsToEarn;
        await client.clientLoyalty.upsert({
            where: { clientId: invoice.clientId },
            update: {
                balance: newBalance,
                totalEarned: newTotalEarned,
            },
            create: {
                clientId: invoice.clientId,
                balance: pointsToEarn,
                totalEarned: pointsToEarn,
                totalRedeemed: 0,
            },
        });
        // Create LoyaltyTransaction
        const now = new Date();
        await client.loyaltyTransaction.create({
            data: {
                clientId: invoice.clientId,
                type: client_1.LoyaltyTransactionType.EARN,
                points: pointsToEarn,
                balanceAfter: newBalance,
                source: `Invoice Payment: ${invoice.invoiceNumber}`,
                invoiceId: invoice.id,
                date: now,
            },
        });
        // Update invoice pointsEarned
        await client.invoice.update({
            where: { id: invoice.id },
            data: { pointsEarned: pointsToEarn },
        });
        // Update Client lastVisitAt
        await client.client.update({
            where: { id: invoice.clientId },
            data: { lastVisitAt: now },
        });
        // Log ClientHistory
        await client.clientHistory.create({
            data: {
                clientId: invoice.clientId,
                action: 'LOYALTY_POINTS_EARNED',
                details: `Earned ${pointsToEarn} loyalty points from Invoice ${invoice.invoiceNumber}. New balance: ${newBalance} points`,
            },
        });
    }
    /**
     * Get client's loyalty profile, current balance, totals, and transaction history.
     */
    async getClientLoyalty(clientId) {
        const client = await database_1.default.client.findUnique({
            where: { id: clientId },
            select: { id: true, name: true, phone: true, birthday: true, anniversary: true, lastVisitAt: true },
        });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const loyalty = await database_1.default.clientLoyalty.findUnique({
            where: { clientId },
        });
        const history = await database_1.default.loyaltyTransaction.findMany({
            where: { clientId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                invoice: {
                    select: { id: true, invoiceNumber: true, total: true },
                },
            },
        });
        return {
            client,
            balance: loyalty ? loyalty.balance : 0,
            totalEarned: loyalty ? loyalty.totalEarned : 0,
            totalRedeemed: loyalty ? loyalty.totalRedeemed : 0,
            history,
        };
    }
    /**
     * Manager manually adjusts client loyalty points with mandatory reason.
     */
    async adjustClientPoints(clientId, input, authUser) {
        const client = await database_1.default.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return database_1.default.$transaction(async (tx) => {
            const currentLoyalty = await tx.clientLoyalty.findUnique({
                where: { clientId },
            });
            const currentBalance = currentLoyalty ? currentLoyalty.balance : 0;
            const currentEarned = currentLoyalty ? currentLoyalty.totalEarned : 0;
            const newBalance = currentBalance + input.pointsDelta;
            if (newBalance < 0) {
                throw new errorHandler_1.AppError(`Cannot deduct ${Math.abs(input.pointsDelta)} points: client only has ${currentBalance} points`, constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const updated = await tx.clientLoyalty.upsert({
                where: { clientId },
                update: {
                    balance: newBalance,
                    totalEarned: input.pointsDelta > 0 ? currentEarned + input.pointsDelta : currentEarned,
                },
                create: {
                    clientId,
                    balance: newBalance,
                    totalEarned: Math.max(0, input.pointsDelta),
                    totalRedeemed: 0,
                },
            });
            const now = new Date();
            const transaction = await tx.loyaltyTransaction.create({
                data: {
                    clientId,
                    type: client_1.LoyaltyTransactionType.ADJUST,
                    points: input.pointsDelta,
                    balanceAfter: newBalance,
                    source: `Manual adjustment by ${authUser.role}: ${input.reason.trim()}`,
                    date: now,
                },
            });
            await tx.clientHistory.create({
                data: {
                    clientId,
                    action: 'LOYALTY_POINTS_ADJUSTED',
                    details: `Points adjusted by ${input.pointsDelta} points (${input.reason.trim()}). New balance: ${newBalance} points`,
                    performedBy: authUser.id,
                },
            });
            return {
                balance: updated.balance,
                pointsDelta: input.pointsDelta,
                transaction,
            };
        });
    }
    /**
     * Redeem loyalty points during invoicing for a direct discount.
     */
    async redeemPointsForInvoice(invoiceId, input, authUser) {
        const invoice = await database_1.default.invoice.findUnique({
            where: { id: invoiceId },
        });
        if (!invoice) {
            throw new errorHandler_1.AppError('Invoice not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        if (!invoice.clientId) {
            throw new errorHandler_1.AppError('Cannot redeem points on invoice without an associated client', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (invoice.status === client_1.InvoiceStatus.PAID) {
            throw new errorHandler_1.AppError('Cannot redeem points on an already PAID invoice', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const setting = await this.getSettings();
        if (input.pointsToRedeem < setting.minPointsToRedeem) {
            throw new errorHandler_1.AppError(`Minimum ${setting.minPointsToRedeem} points required for redemption (requested: ${input.pointsToRedeem})`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const clientLoyalty = await database_1.default.clientLoyalty.findUnique({
            where: { clientId: invoice.clientId },
        });
        const currentBalance = clientLoyalty ? clientLoyalty.balance : 0;
        if (currentBalance < input.pointsToRedeem) {
            throw new errorHandler_1.AppError(`Insufficient loyalty points (available: ${currentBalance}, requested: ${input.pointsToRedeem})`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Calculate discount value in FCFA
        const redemptionBlocks = Math.floor(input.pointsToRedeem / setting.pointsForDiscount);
        if (redemptionBlocks <= 0) {
            throw new errorHandler_1.AppError(`Points must be redeemed in blocks of ${setting.pointsForDiscount} points`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const discountAmount = redemptionBlocks * setting.discountAmount;
        return database_1.default.$transaction(async (tx) => {
            // Deduct points
            const newBalance = currentBalance - input.pointsToRedeem;
            const newTotalRedeemed = (clientLoyalty ? clientLoyalty.totalRedeemed : 0) + input.pointsToRedeem;
            await tx.clientLoyalty.update({
                where: { clientId: invoice.clientId },
                data: {
                    balance: newBalance,
                    totalRedeemed: newTotalRedeemed,
                },
            });
            // Log REDEEM transaction
            const now = new Date();
            await tx.loyaltyTransaction.create({
                data: {
                    clientId: invoice.clientId,
                    type: client_1.LoyaltyTransactionType.REDEEM,
                    points: input.pointsToRedeem,
                    balanceAfter: newBalance,
                    source: `Redeemed on Invoice ${invoice.invoiceNumber}`,
                    invoiceId: invoice.id,
                    date: now,
                },
            });
            // Apply discount to invoice
            const updatedDiscount = Number(invoice.discount) + discountAmount;
            const updatedTotal = Math.max(0, Number(invoice.subtotal) - updatedDiscount);
            const updatedPointsRedeemed = invoice.pointsRedeemed + input.pointsToRedeem;
            const updatedInvoice = await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                    discount: new client_1.Prisma.Decimal(updatedDiscount),
                    total: new client_1.Prisma.Decimal(updatedTotal),
                    pointsRedeemed: updatedPointsRedeemed,
                },
            });
            // Log in ClientHistory
            await tx.clientHistory.create({
                data: {
                    clientId: invoice.clientId,
                    action: 'LOYALTY_POINTS_REDEEMED',
                    details: `Redeemed ${input.pointsToRedeem} points for ${discountAmount} FCFA discount on Invoice ${invoice.invoiceNumber}. Remaining balance: ${newBalance} points`,
                    performedBy: authUser.id,
                },
            });
            return {
                invoice: {
                    id: updatedInvoice.id,
                    invoiceNumber: updatedInvoice.invoiceNumber,
                    subtotal: Number(updatedInvoice.subtotal),
                    discount: Number(updatedInvoice.discount),
                    total: Number(updatedInvoice.total),
                    pointsRedeemed: updatedInvoice.pointsRedeemed,
                },
                pointsRedeemed: input.pointsToRedeem,
                discountApplied: discountAmount,
                remainingBalance: newBalance,
            };
        });
    }
    /**
     * Award birthday or anniversary celebration reward points to a client.
     */
    async awardCelebrationReward(clientId, input, authUser) {
        const client = await database_1.default.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const setting = await this.getSettings();
        const defaultPoints = input.rewardType === 'BIRTHDAY' ? setting.birthdayRewardPoints : setting.anniversaryRewardPoints;
        const pointsToAward = input.points || defaultPoints;
        return database_1.default.$transaction(async (tx) => {
            const currentLoyalty = await tx.clientLoyalty.findUnique({
                where: { clientId },
            });
            const currentBalance = currentLoyalty ? currentLoyalty.balance : 0;
            const currentEarned = currentLoyalty ? currentLoyalty.totalEarned : 0;
            const newBalance = currentBalance + pointsToAward;
            const updated = await tx.clientLoyalty.upsert({
                where: { clientId },
                update: {
                    balance: newBalance,
                    totalEarned: currentEarned + pointsToAward,
                },
                create: {
                    clientId,
                    balance: pointsToAward,
                    totalEarned: pointsToAward,
                    totalRedeemed: 0,
                },
            });
            const now = new Date();
            const transaction = await tx.loyaltyTransaction.create({
                data: {
                    clientId,
                    type: client_1.LoyaltyTransactionType.EARN,
                    points: pointsToAward,
                    balanceAfter: newBalance,
                    source: `${input.rewardType}_REWARD`,
                    date: now,
                },
            });
            await tx.clientHistory.create({
                data: {
                    clientId,
                    action: 'REWARD_EARNED',
                    details: `${input.rewardType} celebration reward of ${pointsToAward} points awarded`,
                    performedBy: authUser.id,
                },
            });
            return {
                client: { id: client.id, name: client.name },
                rewardType: input.rewardType,
                pointsAwarded: pointsToAward,
                newBalance: updated.balance,
                transaction,
            };
        });
    }
    /**
     * Returns list of clients with birthdays or anniversaries in the upcoming window (e.g. 30 days).
     */
    async getUpcomingCelebrations(daysAhead = 30) {
        const clients = await database_1.default.client.findMany({
            where: {
                isActive: true,
                OR: [{ birthday: { not: null } }, { anniversary: { not: null } }],
            },
            select: {
                id: true,
                name: true,
                phone: true,
                whatsapp: true,
                quartier: true,
                birthday: true,
                anniversary: true,
                loyalty: { select: { balance: true } },
            },
        });
        const now = new Date();
        const currentMonth = now.getUTCMonth();
        const currentDay = now.getUTCDate();
        const celebrations = [];
        for (const c of clients) {
            if (c.birthday) {
                const bDate = new Date(c.birthday);
                const bMonth = bDate.getUTCMonth();
                const bDay = bDate.getUTCDate();
                // Check if celebration falls in the same month or within daysAhead
                if (bMonth === currentMonth) {
                    celebrations.push({
                        clientId: c.id,
                        clientName: c.name,
                        phone: c.phone,
                        whatsapp: c.whatsapp,
                        type: 'BIRTHDAY',
                        date: `${String(bMonth + 1).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`,
                        loyaltyBalance: c.loyalty?.balance || 0,
                        isToday: bMonth === currentMonth && bDay === currentDay,
                    });
                }
            }
            if (c.anniversary) {
                const aDate = new Date(c.anniversary);
                const aMonth = aDate.getUTCMonth();
                const aDay = aDate.getUTCDate();
                if (aMonth === currentMonth) {
                    celebrations.push({
                        clientId: c.id,
                        clientName: c.name,
                        phone: c.phone,
                        whatsapp: c.whatsapp,
                        type: 'ANNIVERSARY',
                        date: `${String(aMonth + 1).padStart(2, '0')}-${String(aDay).padStart(2, '0')}`,
                        loyaltyBalance: c.loyalty?.balance || 0,
                        isToday: aMonth === currentMonth && aDay === currentDay,
                    });
                }
            }
        }
        return { celebrations };
    }
    /**
     * Customer Retention: Rebooking tracking
     * Identifies clients due for rebooking:
     * - DUE: 21 to 44 days since last visit
     * - OVERDUE: 45 to 89 days since last visit
     * - LAPSED: 90+ days since last visit
     * Excludes clients who already have an upcoming scheduled/in-progress appointment.
     */
    async getRebookingClients(query) {
        const now = new Date();
        // Fetch all active clients with their appointments and loyalty
        const clients = await database_1.default.client.findMany({
            where: {
                isActive: true,
                quartier: query.quartier ? query.quartier.trim() : undefined,
            },
            include: {
                loyalty: { select: { balance: true } },
                appointments: {
                    orderBy: { appointmentDate: 'desc' },
                    take: 5,
                    include: {
                        appointmentServices: {
                            include: { service: { select: { name: true, category: true } } },
                        },
                    },
                },
                invoices: {
                    where: { status: 'PAID' },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });
        const rebookingList = [];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        for (const c of clients) {
            // Check if client has any upcoming or active appointment today/future
            const hasUpcoming = c.appointments.some((a) => (a.status === client_1.AppointmentStatus.SCHEDULED || a.status === client_1.AppointmentStatus.IN_PROGRESS) &&
                new Date(a.appointmentDate).getTime() >= startOfToday.getTime());
            if (hasUpcoming) {
                continue; // Client already booked
            }
            // Determine most recent visit date across lastVisitAt, completed appointments, and invoices
            const candidateTimes = [];
            let lastServiceSummary = '';
            if (c.lastVisitAt) {
                candidateTimes.push(new Date(c.lastVisitAt).getTime());
            }
            const completedAppt = c.appointments.find((a) => a.status === client_1.AppointmentStatus.COMPLETED);
            if (completedAppt) {
                candidateTimes.push(new Date(completedAppt.appointmentDate).getTime());
                lastServiceSummary = completedAppt.serviceSummary || '';
            }
            for (const inv of (c.invoices || [])) {
                if (inv.date)
                    candidateTimes.push(new Date(inv.date).getTime());
                if (inv.createdAt)
                    candidateTimes.push(new Date(inv.createdAt).getTime());
            }
            if (candidateTimes.length === 0) {
                continue; // New client with no past visit
            }
            const latestTime = Math.max(...candidateTimes);
            const diffMs = now.getTime() - latestTime;
            const daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            // Rebooking status classification
            let status = null;
            if (daysSinceLastVisit >= 90) {
                status = 'LAPSED';
            }
            else if (daysSinceLastVisit >= 45) {
                status = 'OVERDUE';
            }
            else if (daysSinceLastVisit >= 21) {
                status = 'DUE';
            }
            if (!status) {
                continue; // Recent visit (< 21 days)
            }
            if (query.status && query.status !== status) {
                continue;
            }
            if (query.daysInactive && daysSinceLastVisit < Number(query.daysInactive)) {
                continue;
            }
            rebookingList.push({
                clientId: c.id,
                name: c.name,
                phone: c.phone,
                whatsapp: c.whatsapp,
                quartier: c.quartier,
                lastVisitDate: new Date(latestTime),
                daysSinceLastVisit,
                status,
                lastServiceSummary,
                loyaltyBalance: c.loyalty?.balance || 0,
                totalVisits: c.appointments.filter((a) => a.status === client_1.AppointmentStatus.COMPLETED).length,
            });
        }
        // Sort by days since last visit descending (most urgent / overdue first)
        rebookingList.sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);
        const page = Math.max(1, parseInt(String(query.page || 1), 10));
        const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
        const skip = (page - 1) * limit;
        const paginated = rebookingList.slice(skip, skip + limit);
        return {
            clients: paginated,
            summary: {
                totalDue: rebookingList.filter((r) => r.status === 'DUE').length,
                totalOverdue: rebookingList.filter((r) => r.status === 'OVERDUE').length,
                totalLapsed: rebookingList.filter((r) => r.status === 'LAPSED').length,
                totalActionable: rebookingList.length,
            },
            pagination: {
                total: rebookingList.length,
                page,
                limit,
                totalPages: Math.ceil(rebookingList.length / limit),
            },
        };
    }
}
exports.LoyaltyService = LoyaltyService;
exports.loyaltyService = new LoyaltyService();
//# sourceMappingURL=loyalty.service.js.map