"use strict";
/**
 * OMEGA SPA POS — Penalties & Disciplinary Service
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.penaltiesService = exports.PenaltiesService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const penalties_types_1 = require("./penalties.types");
class PenaltiesService {
    /**
     * Get standard conduct rules catalog with recommended default amounts
     */
    getStandardRules() {
        return penalties_types_1.STANDARD_CONDUCT_RULES;
    }
    /**
     * Record a new disciplinary penalty for a staff member (Manager action)
     */
    async createPenalty(input) {
        const { staffId, ruleName, penaltyAmount, date, notes, recordedById } = input;
        // 1. Validate staff member exists
        const staff = await database_1.default.user.findUnique({
            where: { id: staffId },
            include: {
                role: true,
                staffProfile: true,
            },
        });
        if (!staff) {
            throw new errorHandler_1.AppError('Staff member not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // 2. Validate rule name
        if (!ruleName || typeof ruleName !== 'string' || !ruleName.trim()) {
            throw new errorHandler_1.AppError('Rule name is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 3. Validate penalty amount
        const amountNum = Number(penaltyAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new errorHandler_1.AppError('Penalty amount must be a positive number', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 4. Validate and normalize date
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!date || !dateRegex.test(date.trim())) {
            throw new errorHandler_1.AppError('Invalid date format. Expected YYYY-MM-DD', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const parsedDate = new Date(`${date.trim()}T00:00:00.000Z`);
        if (isNaN(parsedDate.getTime())) {
            throw new errorHandler_1.AppError('Invalid date value', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 5. Validate manager/recorder exists
        const recorder = await database_1.default.user.findUnique({
            where: { id: recordedById },
            include: { staffProfile: true },
        });
        if (!recorder) {
            throw new errorHandler_1.AppError('Recording manager not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // 6. Create penalty record in DB
        const record = await database_1.default.staffPenalty.create({
            data: {
                staffId,
                ruleName: ruleName.trim(),
                penaltyAmount: amountNum,
                date: parsedDate,
                notes: notes?.trim() || null,
                recordedById,
            },
            include: {
                staff: {
                    include: {
                        role: true,
                        staffProfile: true,
                    },
                },
                recordedBy: {
                    include: {
                        staffProfile: true,
                    },
                },
            },
        });
        return {
            id: record.id,
            staffId: record.staffId,
            staffName: record.staff.staffProfile?.name || record.staff.email,
            staffEmail: record.staff.email,
            staffRole: record.staff.role?.name || 'STAFF',
            ruleName: record.ruleName,
            penaltyAmount: Number(record.penaltyAmount),
            date: date.trim(),
            notes: record.notes,
            recordedById: record.recordedById,
            recordedByName: record.recordedBy.staffProfile?.name || record.recordedBy.email,
            createdAt: record.createdAt.toISOString(),
        };
    }
    /**
     * Retrieve penalty records with optional filters (staffId, date, date range, month)
     */
    async getPenalties(filters) {
        const where = {};
        if (filters.staffId) {
            where.staffId = filters.staffId;
        }
        // Handle date filtering
        if (filters.date) {
            const cleanDate = filters.date.trim().slice(0, 10);
            const startOfDay = new Date(`${cleanDate}T00:00:00.000Z`);
            const endOfDay = new Date(`${cleanDate}T23:59:59.999Z`);
            where.date = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }
        else if (filters.month) {
            // YYYY-MM filter
            const [yearStr, monthStr] = filters.month.split('-');
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);
            if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
                const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
                const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
                where.date = {
                    gte: startOfMonth,
                    lte: endOfMonth,
                };
            }
        }
        else if (filters.startDate || filters.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(`${filters.startDate.trim().slice(0, 10)}T00:00:00.000Z`);
            }
            if (filters.endDate) {
                where.date.lte = new Date(`${filters.endDate.trim().slice(0, 10)}T23:59:59.999Z`);
            }
        }
        const records = await database_1.default.staffPenalty.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            include: {
                staff: {
                    include: {
                        role: true,
                        staffProfile: true,
                    },
                },
                recordedBy: {
                    include: {
                        staffProfile: true,
                    },
                },
            },
        });
        let totalPenalties = 0;
        const penalties = records.map((record) => {
            const amount = Number(record.penaltyAmount);
            totalPenalties += amount;
            const dateStr = record.date instanceof Date
                ? record.date.toISOString().slice(0, 10)
                : String(record.date).slice(0, 10);
            return {
                id: record.id,
                staffId: record.staffId,
                staffName: record.staff.staffProfile?.name || record.staff.email,
                staffEmail: record.staff.email,
                staffRole: record.staff.role?.name || 'STAFF',
                ruleName: record.ruleName,
                penaltyAmount: amount,
                date: dateStr,
                notes: record.notes,
                recordedById: record.recordedById,
                recordedByName: record.recordedBy.staffProfile?.name || record.recordedBy.email,
                createdAt: record.createdAt.toISOString(),
            };
        });
        return {
            penalties,
            totalPenalties,
            count: penalties.length,
        };
    }
    /**
     * Delete / void a mistaken penalty record (Manager only)
     */
    async deletePenalty(id) {
        const existing = await database_1.default.staffPenalty.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new errorHandler_1.AppError('Penalty record not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        await database_1.default.staffPenalty.delete({
            where: { id },
        });
        return {
            success: true,
            message: 'Penalty record deleted successfully',
        };
    }
}
exports.PenaltiesService = PenaltiesService;
exports.penaltiesService = new PenaltiesService();
//# sourceMappingURL=penalties.service.js.map