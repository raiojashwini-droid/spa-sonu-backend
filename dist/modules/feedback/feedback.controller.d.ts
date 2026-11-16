import { Request, Response, NextFunction } from 'express';
export declare class FeedbackController {
    /**
     * GET /api/v1/public/feedback/:token
     */
    getByToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/v1/public/feedback/:token
     */
    submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/v1/feedback/generate-token
     */
    generateToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/client-feedback (Manager & Reception)
     */
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const feedbackController: FeedbackController;
//# sourceMappingURL=feedback.controller.d.ts.map