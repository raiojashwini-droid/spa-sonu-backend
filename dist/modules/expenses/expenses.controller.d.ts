import { Request, Response, NextFunction } from 'express';
export declare class ExpensesController {
    getExpenses(req: Request, res: Response, next: NextFunction): Promise<void>;
    createExpense(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const expensesController: ExpensesController;
//# sourceMappingURL=expenses.controller.d.ts.map