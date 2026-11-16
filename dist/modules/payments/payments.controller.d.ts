import { Request, Response, NextFunction } from 'express';
export declare class PaymentsController {
    recordPayment(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPayments(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const paymentsController: PaymentsController;
//# sourceMappingURL=payments.controller.d.ts.map