import { Request, Response, NextFunction } from 'express';
export declare const allowRoles: (...allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRoles: (...allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=roleMiddleware.d.ts.map