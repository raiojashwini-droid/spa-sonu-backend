import { CreateExpenseInput, ExpenseQueryFilter } from './expenses.types';
export declare class ExpensesService {
    getExpenses(query?: ExpenseQueryFilter): Promise<{
        id: string;
        date: string;
        category: import(".prisma/client").$Enums.ExpenseCategory;
        amount: number;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        note: string;
        createdBy: string;
        createdByUserId: string;
        createdAt: string;
        updatedAt: string;
    }[]>;
    createExpense(input: CreateExpenseInput, userId: string): Promise<{
        id: string;
        date: string;
        category: import(".prisma/client").$Enums.ExpenseCategory;
        amount: number;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        note: string;
        createdBy: string;
        createdByUserId: string;
        createdAt: string;
    }>;
    deleteExpense(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const expensesService: ExpensesService;
//# sourceMappingURL=expenses.service.d.ts.map