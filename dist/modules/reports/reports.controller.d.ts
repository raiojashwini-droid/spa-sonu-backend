import { Request, Response, NextFunction } from 'express';
export declare class ReportsController {
    getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void>;
    getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAppointmentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTopServices(req: Request, res: Response, next: NextFunction): Promise<void>;
    getServicePerformance(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTechniciansPerformance(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMyTechnicianPerformance(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTechnicianById(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStockConsumptionReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCustomerAnalytics(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const reportsController: ReportsController;
//# sourceMappingURL=reports.controller.d.ts.map