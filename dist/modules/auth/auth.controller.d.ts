import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    login(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const authController: AuthController;
//# sourceMappingURL=auth.controller.d.ts.map