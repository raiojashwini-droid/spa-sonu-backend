"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesService = exports.ExpensesService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class ExpensesService {
    async getExpenses(query = {}) {
        const where = {};
        if (query.date) {
            where.date = new Date(query.date);
        }
        else if (query.startDate || query.endDate) {
            where.date = {};
            if (query.startDate)
                where.date.gte = new Date(query.startDate);
            if (query.endDate)
                where.date.lte = new Date(query.endDate);
        }
        if (query.category) {
            where.category = query.category;
        }
        if (query.paymentMethod) {
            where.paymentMethod = query.paymentMethod;
        }
        const expenses = await database_1.default.expense.findMany({
            where,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        role: { select: { name: true } },
                        staffProfile: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return expenses.map((e) => ({
            id: e.id,
            date: e.date.toISOString().slice(0, 10),
            category: e.category,
            amount: Number(e.amount),
            paymentMethod: e.paymentMethod,
            note: e.note,
            createdBy: e.createdBy.staffProfile?.name || e.createdBy.email.split('@')[0],
            createdByUserId: e.createdById,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
        }));
    }
    async createExpense(input, userId) {
        const expense = await database_1.default.expense.create({
            data: {
                date: new Date(input.date),
                category: input.category,
                amount: new client_1.Prisma.Decimal(input.amount),
                paymentMethod: input.paymentMethod,
                note: input.note.trim(),
                createdById: userId,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
            },
        });
        return {
            id: expense.id,
            date: expense.date.toISOString().slice(0, 10),
            category: expense.category,
            amount: Number(expense.amount),
            paymentMethod: expense.paymentMethod,
            note: expense.note,
            createdBy: expense.createdBy.staffProfile?.name || expense.createdBy.email.split('@')[0],
            createdByUserId: expense.createdById,
            createdAt: expense.createdAt.toISOString(),
        };
    }
    async deleteExpense(id) {
        const existing = await database_1.default.expense.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Expense not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        await database_1.default.expense.delete({ where: { id } });
        return { success: true, message: 'Expense deleted successfully' };
    }
}
exports.ExpensesService = ExpensesService;
exports.expensesService = new ExpensesService();
//# sourceMappingURL=expenses.service.js.map