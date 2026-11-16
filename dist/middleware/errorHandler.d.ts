import { Request, Response, NextFunction } from 'express';
/**
 * Custom application error class.
 * Extends native Error with HTTP status code support.
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns a standardized JSON response.
 */
export declare const errorHandler: (err: Error | AppError, _req: Request, res: Response, _next: NextFunction) => void;
/**
 * 404 Not Found handler for undefined routes.
 */
export declare const notFoundHandler: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map