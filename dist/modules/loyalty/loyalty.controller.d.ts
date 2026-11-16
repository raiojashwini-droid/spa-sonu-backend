import { Request, Response, NextFunction } from 'express';
export declare class LoyaltyController {
    getSettings(_req: Request, res: Response, next: NextFunction): Promise<void>;
    updateSettings(req: Request, res: Response, next: NextFunction): Promise<void>;
    getClientLoyalty(req: Request, res: Response, next: NextFunction): Promise<void>;
    adjustClientPoints(req: Request, res: Response, next: NextFunction): Promise<void>;
    redeemPointsForInvoice(req: Request, res: Response, next: NextFunction): Promise<void>;
    awardCelebrationReward(req: Request, res: Response, next: NextFunction): Promise<void>;
    getUpcomingCelebrations(req: Request, res: Response, next: NextFunction): Promise<void>;
    getRebookingClients(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const loyaltyController: LoyaltyController;
//# sourceMappingURL=loyalty.controller.d.ts.map