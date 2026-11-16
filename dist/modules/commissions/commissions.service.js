"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionsService = exports.CommissionsService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class CommissionsService {
    /**
     * Automatically calculates and generates technician commissions for a PAID invoice.
     * - Only executes if invoice status === PAID.
     * - Idempotent: Prevents duplicate commission generation.
     * - Calculates based on the actual technician assigned to each service item.
     * - Supports service-wise commission percentages.
     * - Also generates employee referral commissions if applicable.
     */
    async generateCommissionsForInvoice(invoiceId, txClient) {
        const client = txClient || database_1.default;
        const invoice = await client.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                items: {
                    include: {
                        service: true,
                        technician: {
                            include: { staffProfile: true },
                        },
                    },
                },
            },
        });
        if (!invoice)
            return;
        // Requirement: Commission ONLY after payment received (PAID invoice)
        if (invoice.status !== client_1.InvoiceStatus.PAID) {
            return;
        }
        // Requirement: Prevent duplicate commission creation for the same invoice
        const existingCount = await client.technicianCommission.count({
            where: { invoiceId },
        });
        if (existingCount > 0) {
            return; // Already generated
        }
        // Fetch active service commission rules from CommissionRule table
        const serviceRules = await client.commissionRule.findMany({
            where: { type: client_1.CommissionType.SERVICE, isActive: true },
        });
        const ruleMap = new Map();
        for (const r of serviceRules) {
            if (r.serviceCategory) {
                ruleMap.set(r.serviceCategory.toLowerCase(), Number(r.percentage));
            }
        }
        const serviceItems = invoice.items.filter((item) => item.itemType === client_1.InvoiceItemType.SERVICE && item.technicianId);
        // Generate employee referral commission if client was introduced by staff
        const referralRecord = await this.generateEmployeeReferralCommission(invoiceId, client);
        for (const item of serviceItems) {
            const category = (item.service?.category || '').toLowerCase();
            const sName = item.name.toLowerCase();
            // Service-wise commission rate determination:
            // Priority 1: Technician's individual contracted rate (staffProfile.commissionRate)
            // Priority 2: Active category rule from CommissionRule table (ruleMap)
            // Priority 3: Standard category defaults (Nails 15%, Facial 12%, Massage 10%, Default 10%)
            const techProfileRate = Number(item.technician?.staffProfile?.commissionRate || 0);
            let rate = 10; // default 10%
            if (techProfileRate > 0) {
                rate = techProfileRate;
            }
            else if (ruleMap.has(category)) {
                rate = ruleMap.get(category);
            }
            else if (category.includes('nail') || sName.includes('nail')) {
                rate = 15; // Nails: 15%
            }
            else if (category.includes('facial') || sName.includes('facial')) {
                rate = 12; // Facial: 12%
            }
            else if (category.includes('massage') || sName.includes('massage')) {
                rate = 10; // Massage: 10%
            }
            const itemTotal = Number(item.price) * item.quantity;
            const baseCommission = Math.round(((itemTotal * rate) / 100) * 100) / 100;
            // Two-way Referral / Marketer Commission Deduction:
            // When client is introduced by a Marketer or Staff, the marketer's lifetime negotiated percentage
            // is deducted from the technician who provided the service (e.g. 15% tech - 2% marketer = 13% net).
            let referralDeduction = 0;
            if (referralRecord) {
                if (referralRecord.rulePercentage > 0) {
                    referralDeduction = Math.round(((itemTotal * referralRecord.rulePercentage) / 100) * 100) / 100;
                }
                else if (referralRecord.fixedAmount > 0 && serviceItems.length > 0 && !referralRecord.isMarketer) {
                    referralDeduction = Math.round((referralRecord.fixedAmount / serviceItems.length) * 100) / 100;
                }
                // Cap referral deduction at technician's gross commission so technician commission never drops below 0
                referralDeduction = Math.min(baseCommission, referralDeduction);
            }
            const netCommission = Math.max(0, baseCommission - referralDeduction);
            const commission = await client.technicianCommission.create({
                data: {
                    technicianId: item.technicianId,
                    invoiceId: invoice.id,
                    appointmentServiceId: item.appointmentServiceId || null,
                    serviceId: item.serviceId || null,
                    serviceName: item.name,
                    serviceCategory: item.service?.category || null,
                    servicePrice: new client_1.Prisma.Decimal(itemTotal),
                    commissionRate: new client_1.Prisma.Decimal(rate),
                    baseCommission: new client_1.Prisma.Decimal(baseCommission),
                    referralDeduction: new client_1.Prisma.Decimal(referralDeduction),
                    employeeCommissionId: referralRecord ? referralRecord.id : null,
                    bonusAmount: new client_1.Prisma.Decimal(0),
                    totalCommission: new client_1.Prisma.Decimal(netCommission),
                    status: client_1.CommissionStatus.PENDING,
                    notes: referralDeduction > 0
                        ? `Generated on payment for Invoice ${invoice.invoiceNumber} (${referralRecord?.isMarketer ? 'Marketer lifetime' : 'Referral'} deduction: -${referralDeduction} FCFA)`
                        : `Generated on payment for Invoice ${invoice.invoiceNumber}`,
                },
            });
            // Audit trail: log CommissionActivity
            await client.commissionActivity.create({
                data: {
                    technicianCommissionId: commission.id,
                    type: client_1.CommissionActivityType.GENERATED,
                    amount: new client_1.Prisma.Decimal(netCommission),
                    previousTotal: new client_1.Prisma.Decimal(0),
                    newTotal: new client_1.Prisma.Decimal(netCommission),
                    reason: referralDeduction > 0
                        ? `Commission generated at ${rate}% for service "${item.name}" (${baseCommission} FCFA gross, -${referralDeduction} FCFA ${referralRecord?.isMarketer ? 'Marketer' : 'referral'} deduction, ${netCommission} FCFA net) upon payment of Invoice ${invoice.invoiceNumber}`
                        : `Commission generated at ${rate}% for service "${item.name}" upon payment of Invoice ${invoice.invoiceNumber}`,
                },
            });
        }
    }
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
    async generateEmployeeReferralCommission(invoiceId, client) {
        const invoice = await client.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: {
                    select: {
                        id: true,
                        introducedByEmployeeId: true,
                        source: true,
                    },
                },
                items: {
                    where: { itemType: client_1.InvoiceItemType.SERVICE },
                    select: { price: true, quantity: true, technicianId: true },
                },
            },
        });
        if (!invoice || !invoice.client)
            return null;
        if (!invoice.client.introducedByEmployeeId)
            return null;
        const employeeId = invoice.client.introducedByEmployeeId;
        // Verify the referring employee exists, is active, and is NOT a Manager
        const employee = await client.user.findUnique({
            where: { id: employeeId },
            include: { role: true, staffProfile: true },
        });
        if (!employee || !employee.isActive)
            return null;
        if (employee.role?.name === 'MANAGER')
            return null;
        const specs = Array.isArray(employee.staffProfile?.specialties)
            ? employee.staffProfile.specialties
            : [];
        const isMarketer = employee.role?.name === 'MARKETER' ||
            specs.some((s) => String(s).toLowerCase() === 'marketer');
        // Only skip non-marketers if source is not staff referral
        if (!isMarketer && invoice.client.source !== 'STAFF_REFERRAL') {
            return null;
        }
        // Determine if this is the client's first paid invoice (First Visit)
        const priorPaidCount = await client.invoice.count({
            where: {
                clientId: invoice.client.id,
                status: client_1.InvoiceStatus.PAID,
                id: { not: invoiceId },
            },
        });
        const isFirstVisit = priorPaidCount === 0;
        // Service items subtotal
        const serviceItems = invoice.items.filter((it) => it.technicianId);
        const serviceSubtotal = serviceItems.reduce((acc, it) => acc + Number(it.price) * (it.quantity || 1), 0);
        // Look up active commission rules for fallback
        const referralRules = await client.commissionRule.findMany({
            where: {
                isActive: true,
                OR: [
                    { type: client_1.CommissionType.REFERRAL },
                    { serviceCategory: 'Marketer' },
                    { serviceCategory: 'General' },
                    { serviceCategory: 'Referral' },
                ],
            },
            orderBy: { updatedAt: 'desc' },
        });
        const rule = referralRules[0] || null;
        // 1. Negotiated Lifetime Percentage:
        // Marketer's contract commissionRate takes highest precedence
        const contractRate = Number(employee.staffProfile?.commissionRate || 0);
        const rulePercentage = contractRate > 0 ? contractRate : Number(rule?.percentage || (isMarketer ? 2 : 5));
        // 2. Flat Client Acquisition Fee (Bounty):
        // For Marketers, awarded on the first paid visit per newly acquired client
        let flatAcquisitionFee = 0;
        if (isMarketer && isFirstVisit) {
            if (Number(employee.staffProfile?.fixedSalary || 0) > 0) {
                flatAcquisitionFee = Number(employee.staffProfile?.fixedSalary);
            }
            else if (Number(employee.staffProfile?.basePay || 0) > 0) {
                flatAcquisitionFee = Number(employee.staffProfile?.basePay);
            }
            else if (rule?.fixedAmount && Number(rule.fixedAmount) > 0) {
                flatAcquisitionFee = Number(rule.fixedAmount);
            }
            else {
                flatAcquisitionFee = 1000; // Default 1,000 FCFA acquisition bounty per new client
            }
        }
        else if (!isMarketer && isFirstVisit && rule?.fixedAmount) {
            flatAcquisitionFee = Number(rule.fixedAmount);
        }
        // 3. Calculate Commission Payout for this Invoice:
        // Lifetime Percentage on services + (Flat acquisition fee if first visit)
        const percentageCommission = Math.round(((serviceSubtotal * rulePercentage) / 100) * 100) / 100;
        const totalCommission = flatAcquisitionFee + percentageCommission;
        if (totalCommission <= 0 && rulePercentage <= 0)
            return null;
        // Idempotency: Check if EmployeeCommission already exists for this invoice + employee
        const existingEmployeeComm = await client.employeeCommission.findFirst({
            where: { invoiceId, employeeId },
            include: { commissionRule: true },
        });
        if (existingEmployeeComm) {
            return {
                id: existingEmployeeComm.id,
                rulePercentage,
                fixedAmount: flatAcquisitionFee,
                isMarketer,
                isFirstVisit,
            };
        }
        // Create EmployeeCommission record
        const createdComm = await client.employeeCommission.create({
            data: {
                employeeId,
                invoiceId,
                commissionRuleId: rule ? rule.id : null,
                amount: new client_1.Prisma.Decimal(totalCommission),
                status: client_1.CommissionStatus.PENDING,
            },
        });
        return {
            id: createdComm.id,
            rulePercentage,
            fixedAmount: flatAcquisitionFee,
            isMarketer,
            isFirstVisit,
        };
    }
    /**
     * Get commissions list with filtering, summary stats, and RBAC enforcement.
     * TECHNICIAN: Automatically scoped to their own commissions only.
     */
    async getCommissions(query, authUser) {
        const page = Math.max(1, parseInt(String(query.page || 1), 10));
        const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
        const skip = (page - 1) * limit;
        const where = {};
        // RBAC: Technician can ONLY view their own commissions; Marketer views commissions linked to their referrals
        if (authUser.role === 'TECHNICIAN') {
            where.technicianId = authUser.id;
        }
        else if (authUser.role === 'MARKETER') {
            where.employeeCommission = { employeeId: authUser.id };
        }
        else if (query.technicianId) {
            where.technicianId = query.technicianId;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate)
                where.createdAt.gte = new Date(query.startDate);
            if (query.endDate)
                where.createdAt.lte = new Date(query.endDate);
        }
        const [total, commissions, allMatching] = await Promise.all([
            database_1.default.technicianCommission.count({ where }),
            database_1.default.technicianCommission.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    technician: {
                        select: { id: true, email: true, staffProfile: { select: { name: true, phone: true } } },
                    },
                    invoice: {
                        select: { id: true, invoiceNumber: true, status: true, total: true, date: true },
                    },
                    activities: {
                        orderBy: { createdAt: 'desc' },
                        include: {
                            performedBy: {
                                select: { id: true, email: true, staffProfile: { select: { name: true } } },
                            },
                        },
                    },
                },
            }),
            database_1.default.technicianCommission.findMany({
                where,
                select: {
                    baseCommission: true,
                    bonusAmount: true,
                    totalCommission: true,
                    status: true,
                },
            }),
        ]);
        // Aggregate summary statistics
        let totalBase = 0;
        let totalBonus = 0;
        let totalOverall = 0;
        let totalApproved = 0;
        let totalPending = 0;
        for (const c of allMatching) {
            const base = Number(c.baseCommission);
            const bonus = Number(c.bonusAmount);
            const tot = Number(c.totalCommission);
            totalBase += base;
            totalBonus += bonus;
            totalOverall += tot;
            if (c.status === client_1.CommissionStatus.APPROVED || c.status === client_1.CommissionStatus.PAID) {
                totalApproved += tot;
            }
            else {
                totalPending += tot;
            }
        }
        const formatted = commissions.map((c) => ({
            ...c,
            servicePrice: Number(c.servicePrice),
            commissionRate: Number(c.commissionRate),
            baseCommission: Number(c.baseCommission),
            bonusAmount: Number(c.bonusAmount),
            totalCommission: Number(c.totalCommission),
            activities: c.activities.map((a) => ({
                ...a,
                amount: Number(a.amount),
                previousTotal: a.previousTotal ? Number(a.previousTotal) : null,
                newTotal: a.newTotal ? Number(a.newTotal) : null,
            })),
        }));
        return {
            commissions: formatted,
            summary: {
                totalBaseCommission: totalBase,
                totalBonusAmount: totalBonus,
                totalEarned: totalOverall,
                totalApproved,
                totalPending,
            },
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get specific technician commission report.
     * TECHNICIAN: Blocked with 403 Forbidden if requesting another technician's report.
     */
    async getTechnicianCommissions(technicianId, query, authUser) {
        if (authUser.role === 'TECHNICIAN' && technicianId !== authUser.id) {
            throw new errorHandler_1.AppError('Access forbidden: you can only view your own commission history', constants_1.HTTP_STATUS.FORBIDDEN);
        }
        const technician = await database_1.default.user.findUnique({
            where: { id: technicianId },
            include: { staffProfile: true },
        });
        if (!technician) {
            throw new errorHandler_1.AppError('Technician not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const queryWithTech = {
            ...query,
            technicianId,
        };
        const report = await this.getCommissions(queryWithTech, authUser);
        return {
            technician: {
                id: technician.id,
                email: technician.email,
                name: technician.staffProfile?.name || technician.email,
                phone: technician.staffProfile?.phone || null,
            },
            ...report,
        };
    }
    /**
     * Manager adds a performance bonus to a technician's commission record.
     * Logs CommissionActivity with BONUS_ADDED.
     */
    async addBonus(commissionId, input, authUser) {
        const commission = await database_1.default.technicianCommission.findUnique({
            where: { id: commissionId },
        });
        if (!commission) {
            throw new errorHandler_1.AppError('Commission record not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return database_1.default.$transaction(async (tx) => {
            const prevBonus = Number(commission.bonusAmount);
            const prevTotal = Number(commission.totalCommission);
            const newBonus = prevBonus + input.bonusAmount;
            const newTotal = prevTotal + input.bonusAmount;
            const updated = await tx.technicianCommission.update({
                where: { id: commissionId },
                data: {
                    bonusAmount: new client_1.Prisma.Decimal(newBonus),
                    totalCommission: new client_1.Prisma.Decimal(newTotal),
                },
            });
            const reason = input.reason ? input.reason.trim() : 'Performance bonus awarded by Manager';
            await tx.commissionActivity.create({
                data: {
                    technicianCommissionId: commissionId,
                    type: client_1.CommissionActivityType.BONUS_ADDED,
                    amount: new client_1.Prisma.Decimal(input.bonusAmount),
                    previousTotal: new client_1.Prisma.Decimal(prevTotal),
                    newTotal: new client_1.Prisma.Decimal(newTotal),
                    reason,
                    performedById: authUser.id,
                },
            });
            return {
                ...updated,
                servicePrice: Number(updated.servicePrice),
                commissionRate: Number(updated.commissionRate),
                baseCommission: Number(updated.baseCommission),
                bonusAmount: Number(updated.bonusAmount),
                totalCommission: Number(updated.totalCommission),
            };
        });
    }
    /**
     * Manager adjusts commission amount or rate with mandatory reason.
     * Logs CommissionActivity with ADJUSTED.
     */
    async adjustCommission(commissionId, input, authUser) {
        const commission = await database_1.default.technicianCommission.findUnique({
            where: { id: commissionId },
        });
        if (!commission) {
            throw new errorHandler_1.AppError('Commission record not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return database_1.default.$transaction(async (tx) => {
            const prevTotal = Number(commission.totalCommission);
            let newBase = Number(commission.baseCommission);
            let newRate = Number(commission.commissionRate);
            if (input.adjustedRate !== undefined) {
                newRate = input.adjustedRate;
                newBase = Math.round(((Number(commission.servicePrice) * newRate) / 100) * 100) / 100;
            }
            else if (input.adjustedAmount !== undefined) {
                newBase = input.adjustedAmount;
            }
            const newTotal = newBase + Number(commission.bonusAmount);
            const updated = await tx.technicianCommission.update({
                where: { id: commissionId },
                data: {
                    baseCommission: new client_1.Prisma.Decimal(newBase),
                    commissionRate: new client_1.Prisma.Decimal(newRate),
                    totalCommission: new client_1.Prisma.Decimal(newTotal),
                    status: client_1.CommissionStatus.ADJUSTED,
                },
            });
            await tx.commissionActivity.create({
                data: {
                    technicianCommissionId: commissionId,
                    type: client_1.CommissionActivityType.ADJUSTED,
                    amount: new client_1.Prisma.Decimal(newTotal - prevTotal),
                    previousTotal: new client_1.Prisma.Decimal(prevTotal),
                    newTotal: new client_1.Prisma.Decimal(newTotal),
                    reason: input.reason.trim(),
                    performedById: authUser.id,
                },
            });
            return {
                ...updated,
                servicePrice: Number(updated.servicePrice),
                commissionRate: Number(updated.commissionRate),
                baseCommission: Number(updated.baseCommission),
                bonusAmount: Number(updated.bonusAmount),
                totalCommission: Number(updated.totalCommission),
            };
        });
    }
    /**
     * Manager approves commission record.
     * Logs CommissionActivity with APPROVED.
     */
    async approveCommission(commissionId, authUser) {
        const commission = await database_1.default.technicianCommission.findUnique({
            where: { id: commissionId },
        });
        if (!commission) {
            throw new errorHandler_1.AppError('Commission record not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const now = new Date();
        return database_1.default.$transaction(async (tx) => {
            const updated = await tx.technicianCommission.update({
                where: { id: commissionId },
                data: {
                    status: client_1.CommissionStatus.APPROVED,
                    approvedById: authUser.id,
                    approvedAt: now,
                },
            });
            await tx.commissionActivity.create({
                data: {
                    technicianCommissionId: commissionId,
                    type: client_1.CommissionActivityType.APPROVED,
                    amount: updated.totalCommission,
                    previousTotal: updated.totalCommission,
                    newTotal: updated.totalCommission,
                    reason: 'Commission approved by Manager',
                    performedById: authUser.id,
                },
            });
            return {
                ...updated,
                servicePrice: Number(updated.servicePrice),
                commissionRate: Number(updated.commissionRate),
                baseCommission: Number(updated.baseCommission),
                bonusAmount: Number(updated.bonusAmount),
                totalCommission: Number(updated.totalCommission),
            };
        });
    }
    /**
     * Manager sets/updates service-wise commission rules.
     */
    async setCommissionRule(input) {
        const category = (input.serviceCategory || 'General').trim();
        const isReferral = input.type === client_1.CommissionType.REFERRAL || category.toLowerCase() === 'general' || category.toLowerCase() === 'referral';
        const ruleType = isReferral ? client_1.CommissionType.REFERRAL : (input.type || client_1.CommissionType.SERVICE);
        const existing = await database_1.default.commissionRule.findFirst({
            where: {
                serviceCategory: category,
            },
        });
        const percentageNum = input.percentage != null ? Number(input.percentage) : 0;
        const fixedAmountNum = input.fixedAmount != null && Number(input.fixedAmount) > 0 ? Number(input.fixedAmount) : null;
        if (existing) {
            return database_1.default.commissionRule.update({
                where: { id: existing.id },
                data: {
                    type: ruleType,
                    percentage: new client_1.Prisma.Decimal(percentageNum),
                    fixedAmount: fixedAmountNum != null ? new client_1.Prisma.Decimal(fixedAmountNum) : null,
                    isActive: true,
                },
            });
        }
        return database_1.default.commissionRule.create({
            data: {
                type: ruleType,
                serviceCategory: category,
                percentage: new client_1.Prisma.Decimal(percentageNum),
                fixedAmount: fixedAmountNum != null ? new client_1.Prisma.Decimal(fixedAmountNum) : null,
                isActive: true,
            },
        });
    }
    async getCommissionRules() {
        return database_1.default.commissionRule.findMany({
            where: { isActive: true },
            orderBy: { updatedAt: 'desc' },
        });
    }
    /**
     * Retrieves Authoritative Monthly Salary & Target Summary for an employee.
     * Dynamically evaluates Mode A (Fixed Salary) vs Mode B (Base Pay + Commission).
     * Implements minimum floor guarantee max(S_fixed, Base + Net Commission).
     */
    async getSalarySummary(technicianId, period) {
        const staff = await database_1.default.user.findUnique({
            where: { id: technicianId },
            include: {
                role: true,
                staffProfile: true,
            },
        });
        if (!staff) {
            throw new errorHandler_1.AppError('Staff member not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // Determine calendar year and month in Africa/Douala
        let year;
        let month; // 1-12
        if (period && /^\d{4}-\d{2}$/.test(period.trim())) {
            const parts = period.trim().split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
        }
        else {
            const doualaStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Africa/Douala',
                year: 'numeric',
                month: '2-digit',
            }).format(new Date()); // "YYYY-MM"
            const parts = doualaStr.split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
        }
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];
        const periodLabel = `${monthNames[month - 1]} ${year}`;
        const periodYearMonth = `${year}-${String(month).padStart(2, '0')}`;
        // Contract parameters with built-in role/specialty fallback presets
        const rawRole = (staff.role?.name || 'TECHNICIAN').toUpperCase();
        let specialties = [];
        if (staff.staffProfile?.specialties) {
            if (Array.isArray(staff.staffProfile.specialties)) {
                specialties = staff.staffProfile.specialties;
            }
            else if (typeof staff.staffProfile.specialties === 'string') {
                try {
                    specialties = JSON.parse(staff.staffProfile.specialties);
                }
                catch {
                    specialties = [];
                }
            }
        }
        const specStr = specialties.join(' ').toLowerCase();
        let defaultTarget = 500000;
        let defaultFixed = 80000;
        let defaultBase = 50000;
        let defaultComm = 15;
        let defaultScope = 'INDIVIDUAL';
        if (rawRole === 'RECEPTION') {
            defaultTarget = 3500000;
            defaultFixed = 100000;
            defaultBase = 150000;
            defaultComm = 0;
            defaultScope = 'SPA_TOTAL';
        }
        else if (specStr.includes('barber')) {
            defaultTarget = 300000;
            defaultFixed = 80000;
            defaultBase = 50000;
            defaultComm = 20;
        }
        else if (specStr.includes('nail')) {
            defaultTarget = 500000;
            defaultFixed = 80000;
            defaultBase = 50000;
            defaultComm = 15;
        }
        else if (specStr.includes('facial') || specStr.includes('esthetician') || specStr.includes('esthetic')) {
            defaultTarget = 642000;
            defaultFixed = 80000;
            defaultBase = 50000;
            defaultComm = 15;
        }
        const monthlyTarget = Number(staff.staffProfile?.monthlyTarget) > 0
            ? Number(staff.staffProfile?.monthlyTarget)
            : defaultTarget;
        const basePay = Number(staff.staffProfile?.basePay) > 0
            ? Number(staff.staffProfile?.basePay)
            : defaultBase;
        const commissionRate = Number(staff.staffProfile?.commissionRate) > 0
            ? Number(staff.staffProfile?.commissionRate)
            : defaultComm;
        const fixedSalary = Number(staff.staffProfile?.fixedSalary) > 0
            ? Number(staff.staffProfile?.fixedSalary)
            : defaultFixed;
        const targetScope = staff.staffProfile?.targetScope || defaultScope;
        const specs = Array.isArray(staff.staffProfile?.specialties)
            ? staff.staffProfile.specialties
            : [];
        const isMarketer = staff.role?.name === 'MARKETER' || specs.some((s) => String(s).toLowerCase() === 'marketer');
        // 1. Compute Individual MTD Sales
        let mtdSales = 0;
        if (isMarketer) {
            // Marketer: compute sales from all paid invoices of clients introduced by this marketer
            const referredInvoices = await database_1.default.invoice.findMany({
                where: {
                    client: {
                        introducedByEmployeeId: staff.id,
                    },
                    status: client_1.InvoiceStatus.PAID,
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                },
                include: {
                    items: {
                        where: { itemType: client_1.InvoiceItemType.SERVICE },
                    },
                },
            });
            for (const inv of referredInvoices) {
                for (const it of inv.items) {
                    mtdSales += Number(it.price) * it.quantity;
                }
            }
        }
        else {
            // Technician: compute sales performed by this technician
            const mtdItems = await database_1.default.invoiceItem.findMany({
                where: {
                    technicianId: staff.id,
                    itemType: client_1.InvoiceItemType.SERVICE,
                    invoice: {
                        status: client_1.InvoiceStatus.PAID,
                        createdAt: { gte: startOfMonth, lte: endOfMonth },
                    },
                },
            });
            for (const it of mtdItems) {
                mtdSales += Number(it.price) * it.quantity;
            }
        }
        // 2. Compute Total Spa MTD Sales
        const allSpaItems = await database_1.default.invoiceItem.findMany({
            where: {
                itemType: client_1.InvoiceItemType.SERVICE,
                invoice: {
                    status: client_1.InvoiceStatus.PAID,
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                },
            },
        });
        let spaTotalSales = 0;
        for (const it of allSpaItems) {
            spaTotalSales += Number(it.price) * it.quantity;
        }
        // 3. Evaluate target qualifying revenue
        const qualifyingRevenue = targetScope === 'SPA_TOTAL' ? spaTotalSales : mtdSales;
        const isTargetMet = monthlyTarget > 0 && qualifyingRevenue >= monthlyTarget;
        const targetProgressPercent = monthlyTarget > 0
            ? Math.min(100, Math.round((qualifyingRevenue / monthlyTarget) * 1000) / 10)
            : 0;
        const salesRemainingToTarget = Math.max(0, monthlyTarget - qualifyingRevenue);
        // 4. Referral deductions & recorded commissions
        let referralDeductionsTotal = 0;
        let rawGrossCommission = 0;
        if (isMarketer) {
            // Marketers earn referral commissions recorded in EmployeeCommission
            const empCommissions = await database_1.default.employeeCommission.findMany({
                where: {
                    employeeId: staff.id,
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                },
            });
            for (const ec of empCommissions) {
                rawGrossCommission += Number(ec.amount || 0);
            }
            // Priority Enforcement: If Marketer has a customized contract commissionRate (e.g. 10%),
            // ensure the commission calculated on qualifying referred sales matches contract rate!
            if (commissionRate > 0 && qualifyingRevenue > 0) {
                const contractCalculatedCommission = Math.round(((qualifyingRevenue * commissionRate) / 100) * 100) / 100;
                rawGrossCommission = Math.max(rawGrossCommission, contractCalculatedCommission);
            }
        }
        else {
            const techCommissions = await database_1.default.technicianCommission.findMany({
                where: {
                    technicianId: staff.id,
                    createdAt: { gte: startOfMonth, lte: endOfMonth },
                },
            });
            for (const tc of techCommissions) {
                referralDeductionsTotal += Number(tc.referralDeduction || 0);
                rawGrossCommission += Number(tc.baseCommission || 0);
            }
        }
        const grossCommissionAccumulated = rawGrossCommission > 0
            ? rawGrossCommission
            : Math.round(((qualifyingRevenue * commissionRate) / 100) * 100) / 100;
        const netCommissionAccumulated = Math.max(0, grossCommissionAccumulated - referralDeductionsTotal);
        // 5. Dynamic Switching Mode & Payout
        let activeMode = 'FIXED_SALARY';
        let modeLabel = 'Fixed Flat Salary (Below Target)';
        let currentProjectedPayout = fixedSalary;
        if (targetScope === 'SPA_TOTAL') {
            if (isTargetMet) {
                activeMode = 'BASE_PLUS_COMMISSION';
                modeLabel = 'Spa Target Met (Elevated Base Pay)';
                currentProjectedPayout = Math.max(fixedSalary, basePay);
            }
            else {
                activeMode = 'FIXED_SALARY';
                modeLabel = 'Fixed Flat Salary (Below Spa Target)';
                currentProjectedPayout = fixedSalary;
            }
        }
        else {
            if (isTargetMet) {
                activeMode = 'BASE_PLUS_COMMISSION';
                modeLabel = 'Target Met (Base Pay + Commission Tier)';
                // Minimum floor protection guaranteed
                currentProjectedPayout = Math.max(fixedSalary, basePay + netCommissionAccumulated);
            }
            else {
                activeMode = 'FIXED_SALARY';
                modeLabel = 'Fixed Flat Salary (Below Target)';
                currentProjectedPayout = fixedSalary;
            }
        }
        // Benchmark simulation at exact quota
        const projectedPayoutAtExactTarget = targetScope === 'SPA_TOTAL'
            ? Math.max(fixedSalary, basePay)
            : Math.max(fixedSalary, basePay + Math.round((monthlyTarget * commissionRate) / 100));
        const potentialGainOnReachingTarget = Math.max(0, projectedPayoutAtExactTarget - fixedSalary);
        // 6. Check if finalized in MonthlyPayrollRecord
        const payrollRecord = await database_1.default.monthlyPayrollRecord.findUnique({
            where: {
                employeeId_periodYearMonth: {
                    employeeId: staff.id,
                    periodYearMonth,
                },
            },
        });
        return {
            technicianId: staff.id,
            technicianName: staff.staffProfile?.name || staff.email.split('@')[0],
            role: rawRole.toLowerCase(),
            specialty: specialties[0] || 'Technician',
            period: periodLabel,
            periodYearMonth,
            contract: {
                monthlyTarget,
                basePay,
                commissionRate,
                fixedSalary,
                targetScope,
            },
            performance: {
                mtdSales,
                salesTotal: mtdSales,
                spaTotalSales,
                targetQuota: monthlyTarget,
                targetProgressPercent,
                percentageAchieved: targetProgressPercent,
                isTargetMet,
                salesRemainingToTarget,
                remainingToTarget: salesRemainingToTarget,
            },
            calculation: {
                activeMode,
                mode: activeMode === 'BASE_PLUS_COMMISSION' ? 'MODE_B_TARGET_MET' : 'MODE_A_BELOW_TARGET',
                modeLabel,
                commissionUnlocked: activeMode === 'BASE_PLUS_COMMISSION',
                fixedSalaryAmount: fixedSalary,
                fixedSalaryFloor: fixedSalary,
                basePayAmount: basePay,
                basePay,
                grossCommissionAccumulated,
                grossCommission: grossCommissionAccumulated,
                referralDeductionsTotal,
                referralDeductions: referralDeductionsTotal,
                totalPenalties: referralDeductionsTotal,
                netCommissionAccumulated,
                netCommission: netCommissionAccumulated,
                unearnedCommissionLocked: activeMode === 'FIXED_SALARY' ? netCommissionAccumulated : 0,
                currentProjectedPayout,
                effectivePayout: currentProjectedPayout,
                calculatedPayout: currentProjectedPayout,
                floorProtectionApplied: currentProjectedPayout === fixedSalary && activeMode === 'BASE_PLUS_COMMISSION',
                projectedPayoutAtExactTarget,
                potentialGainOnReachingTarget,
            },
            isFinalized: Boolean(payrollRecord?.isFinalized),
        };
    }
    /**
     * Finalizes and freezes a month's payroll record for an employee.
     * - Must be Manager role.
     * - Immutability guard: if record is already finalized, returns 403 Forbidden.
     * - Freezes authoritative snapshot into MonthlyPayrollRecord.
     */
    async finalizeMonthlyPayroll(employeeId, period, finalizedById) {
        // 1. Check if record is already finalized (Immutability Guard)
        const existing = await database_1.default.monthlyPayrollRecord.findUnique({
            where: {
                employeeId_periodYearMonth: {
                    employeeId,
                    periodYearMonth: period,
                },
            },
        });
        if (existing?.isFinalized) {
            const err = new Error('Payroll record is finalized and locked against modification.');
            err.statusCode = 403;
            throw err;
        }
        // 2. Fetch authoritative salary summary for the period
        const summary = await this.getSalarySummary(employeeId, period);
        // 3. Upsert into MonthlyPayrollRecord
        const record = await database_1.default.monthlyPayrollRecord.upsert({
            where: {
                employeeId_periodYearMonth: {
                    employeeId,
                    periodYearMonth: period,
                },
            },
            create: {
                employeeId,
                periodYearMonth: period,
                targetScope: summary.contract.targetScope,
                targetQuota: new client_1.Prisma.Decimal(summary.contract.monthlyTarget),
                actualRevenue: new client_1.Prisma.Decimal(summary.performance.mtdSales),
                isTargetMet: summary.performance.isTargetMet,
                salaryMode: summary.calculation.activeMode,
                fixedSalaryAmount: new client_1.Prisma.Decimal(summary.contract.fixedSalary),
                basePayAmount: new client_1.Prisma.Decimal(summary.contract.basePay),
                grossCommission: new client_1.Prisma.Decimal(summary.calculation.grossCommissionAccumulated),
                referralDeductions: new client_1.Prisma.Decimal(summary.calculation.referralDeductionsTotal),
                netCommission: new client_1.Prisma.Decimal(summary.calculation.netCommissionAccumulated),
                finalPayoutAmount: new client_1.Prisma.Decimal(summary.calculation.currentProjectedPayout),
                isFinalized: true,
                finalizedById,
                finalizedAt: new Date(),
            },
            update: {
                targetScope: summary.contract.targetScope,
                targetQuota: new client_1.Prisma.Decimal(summary.contract.monthlyTarget),
                actualRevenue: new client_1.Prisma.Decimal(summary.performance.mtdSales),
                isTargetMet: summary.performance.isTargetMet,
                salaryMode: summary.calculation.activeMode,
                fixedSalaryAmount: new client_1.Prisma.Decimal(summary.contract.fixedSalary),
                basePayAmount: new client_1.Prisma.Decimal(summary.contract.basePay),
                grossCommission: new client_1.Prisma.Decimal(summary.calculation.grossCommissionAccumulated),
                referralDeductions: new client_1.Prisma.Decimal(summary.calculation.referralDeductionsTotal),
                netCommission: new client_1.Prisma.Decimal(summary.calculation.netCommissionAccumulated),
                finalPayoutAmount: new client_1.Prisma.Decimal(summary.calculation.currentProjectedPayout),
                isFinalized: true,
                finalizedById,
                finalizedAt: new Date(),
            },
        });
        return record;
    }
    /**
     * Authoritative Marketer Performance and Commission Ledger Report
     * Returns:
     * - Marketer profile and contract rates
     * - Total introduced clients count
     * - First-visit new clients acquired (bounties earned)
     * - Repeat visits and lifetime percentage commissions
     * - Detailed list of introduced clients and their visits
     */
    async getMarketerPerformance(marketerId, authUser) {
        // Non-managers can only query their own marketer performance
        const targetId = authUser.role === 'MANAGER' ? marketerId : authUser.id;
        const marketer = await database_1.default.user.findUnique({
            where: { id: targetId },
            include: { role: true, staffProfile: true },
        });
        if (!marketer) {
            throw new errorHandler_1.AppError('Marketer not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const [introducedClients, employeeCommissions] = await Promise.all([
            database_1.default.client.findMany({
                where: { introducedByEmployeeId: targetId },
                include: {
                    appointments: {
                        where: { status: 'COMPLETED' },
                        select: { id: true, appointmentDate: true },
                    },
                    invoices: {
                        where: { status: client_1.InvoiceStatus.PAID },
                        select: { id: true, invoiceNumber: true, total: true, date: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            database_1.default.employeeCommission.findMany({
                where: { employeeId: targetId },
                include: {
                    invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            total: true,
                            date: true,
                            client: { select: { id: true, name: true, phone: true } },
                        },
                    },
                    technicianCommissions: {
                        select: {
                            technicianId: true,
                            technician: { select: { email: true, staffProfile: { select: { name: true } } } },
                            serviceName: true,
                            servicePrice: true,
                            referralDeduction: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const totalClientsIntroduced = introducedClients.length;
        const clientsWithPaidVisits = introducedClients.filter((c) => c.invoices.length > 0).length;
        const totalVisitsCount = introducedClients.reduce((acc, c) => acc + c.invoices.length, 0);
        let totalCommissionEarned = 0;
        let totalPendingCommission = 0;
        let totalApprovedCommission = 0;
        for (const ec of employeeCommissions) {
            const amt = Number(ec.amount || 0);
            totalCommissionEarned += amt;
            if (ec.status === client_1.CommissionStatus.APPROVED || ec.status === client_1.CommissionStatus.PAID) {
                totalApprovedCommission += amt;
            }
            else {
                totalPendingCommission += amt;
            }
        }
        const negotiatedPercentage = Number(marketer.staffProfile?.commissionRate || 2);
        const flatAcquisitionFee = Number(marketer.staffProfile?.fixedSalary || marketer.staffProfile?.basePay || 1000);
        return {
            marketer: {
                id: marketer.id,
                email: marketer.email,
                name: marketer.staffProfile?.name || marketer.email,
                phone: marketer.staffProfile?.phone || null,
                contract: {
                    negotiatedPercentage,
                    flatAcquisitionFee,
                },
            },
            metrics: {
                totalClientsIntroduced,
                clientsWithPaidVisits,
                totalVisitsCount,
                totalCommissionEarned,
                totalApprovedCommission,
                totalPendingCommission,
            },
            commissions: employeeCommissions.map((ec) => ({
                id: ec.id,
                invoiceId: ec.invoiceId,
                invoiceNumber: ec.invoice?.invoiceNumber,
                invoiceDate: ec.invoice?.date,
                clientName: ec.invoice?.client?.name,
                amount: Number(ec.amount),
                status: ec.status,
                createdAt: ec.createdAt,
                technicianSplits: ec.technicianCommissions.map((tc) => ({
                    technicianName: tc.technician?.staffProfile?.name || tc.technician?.email,
                    serviceName: tc.serviceName,
                    servicePrice: Number(tc.servicePrice),
                    deductionFromTech: Number(tc.referralDeduction),
                })),
            })),
            clients: introducedClients.map((c) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                totalVisits: c.invoices.length,
                totalSpent: c.invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
                firstVisitDate: c.invoices[c.invoices.length - 1]?.date || null,
                lastVisitDate: c.invoices[0]?.date || null,
            })),
        };
    }
}
exports.CommissionsService = CommissionsService;
exports.commissionsService = new CommissionsService();
//# sourceMappingURL=commissions.service.js.map