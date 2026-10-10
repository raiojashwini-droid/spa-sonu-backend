import { Prisma, ExpenseCategory, PaymentMethod } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { CreateExpenseInput, ExpenseQueryFilter } from './expenses.types';

export class ExpensesService {
  async getExpenses(query: ExpenseQueryFilter = {}) {
    const where: Prisma.ExpenseWhereInput = {};

    if (query.date) {
      where.date = new Date(query.date);
    } else if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    const expenses = await prisma.expense.findMany({
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

  async createExpense(input: CreateExpenseInput, userId: string) {
    const expense = await prisma.expense.create({
      data: {
        date: new Date(input.date),
        category: input.category,
        amount: new Prisma.Decimal(input.amount),
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

  async deleteExpense(id: string) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Expense not found', HTTP_STATUS.NOT_FOUND);
    }

    await prisma.expense.delete({ where: { id } });

    return { success: true, message: 'Expense deleted successfully' };
  }
}

export const expensesService = new ExpensesService();
