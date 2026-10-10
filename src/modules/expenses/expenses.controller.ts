import { Request, Response, NextFunction } from 'express';
import { expensesService } from './expenses.service';
import { createExpenseSchema, expenseQuerySchema } from './expenses.validation';
import { HTTP_STATUS } from '../../config/constants';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class ExpensesController {
  async getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = expenseQuerySchema.parse(req.query);
      const expenses = await expensesService.getExpenses(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: expenses,
      });
    } catch (error) {
      next(error);
    }
  }

  async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createExpenseSchema.parse(req.body);
      const expense = await expensesService.createExpense(input, req.user!.id);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const result = await expensesService.deleteExpense(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const expensesController = new ExpensesController();
