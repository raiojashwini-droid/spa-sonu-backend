import { Request, Response, NextFunction } from 'express';
export declare class StockController {
    getServiceStock(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStockById(req: Request, res: Response, next: NextFunction): Promise<void>;
    createServiceStock(req: Request, res: Response, next: NextFunction): Promise<void>;
    refillStock(req: Request, res: Response, next: NextFunction): Promise<void>;
    adjustStock(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateStock(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStockActivities(req: Request, res: Response, next: NextFunction): Promise<void>;
    getRetailStock(_req: Request, res: Response, next: NextFunction): Promise<void>;
    createRetailProduct(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateRetailProduct(req: Request, res: Response, next: NextFunction): Promise<void>;
    refillRetailProduct(req: Request, res: Response, next: NextFunction): Promise<void>;
    deductRetailStock(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteServiceStock(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteRetailProduct(req: Request, res: Response, next: NextFunction): Promise<void>;
    submitDailyAudit(req: Request, res: Response, next: NextFunction): Promise<void>;
    getDailyAudits(req: Request, res: Response, next: NextFunction): Promise<void>;
    reviewDailyAudit(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteDailyAudit(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const stockController: StockController;
//# sourceMappingURL=stock.controller.d.ts.map