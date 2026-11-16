import { Request, Response, NextFunction } from 'express';
export declare class InvoicesController {
    createInvoice(req: Request, res: Response, next: NextFunction): Promise<void>;
    addInvoiceItem(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPendingInvoices(req: Request, res: Response, next: NextFunction): Promise<void>;
    getInvoices(req: Request, res: Response, next: NextFunction): Promise<void>;
    getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void>;
    getInvoicePdf(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const invoicesController: InvoicesController;
//# sourceMappingURL=invoices.controller.d.ts.map