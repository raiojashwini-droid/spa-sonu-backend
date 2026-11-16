import { Request, Response, NextFunction } from 'express';
export declare class CommissionsController {
    getCommissions(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTechnicianCommissions(req: Request, res: Response, next: NextFunction): Promise<void>;
    addBonus(req: Request, res: Response, next: NextFunction): Promise<void>;
    adjustCommission(req: Request, res: Response, next: NextFunction): Promise<void>;
    approveCommission(req: Request, res: Response, next: NextFunction): Promise<void>;
    setCommissionRule(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCommissionRules(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getSalarySummary(req: Request, res: Response, next: NextFunction): Promise<void>;
    finalizePayroll(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMarketerPerformance(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const commissionsController: CommissionsController;
//# sourceMappingURL=commissions.controller.d.ts.map