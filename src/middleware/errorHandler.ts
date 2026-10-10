import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../config/constants';

/**
 * Custom application error class.
 * Extends native Error with HTTP status code support.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns a standardized JSON response.
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode: number = err instanceof AppError ? err.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // Handle Zod validation errors automatically as 400 Bad Request
  if (err.name === 'ZodError' || (err as any).issues || (err as any).errors) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    const issues = (err as any).issues || (err as any).errors || [];
    message = issues.length > 0 ? issues.map((e: any) => e.message).join(', ') : 'Validation failed';
  } else if ((err as any).code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = HTTP_STATUS.CONFLICT;
    const target = (err as any).meta?.target;
    const field = Array.isArray(target) ? target.join(', ') : target || 'Field';
    message = `${field} already exists in the system. Please use a unique value.`;
  } else if ((err as any).code === 'P2003') {
    // Prisma foreign key constraint failure
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Relational integrity constraint: The referenced record does not exist or is in use.';
  } else if ((err as any).code === 'P2025') {
    // Prisma record not found
    statusCode = HTTP_STATUS.NOT_FOUND;
    message = (err as any).meta?.cause || 'Requested record was not found.';
  }

  const isLocalDev =
    process.env.NODE_ENV === 'development' &&
    !process.env.RAILWAY_ENVIRONMENT &&
    !process.env.RAILWAY_STATIC_URL;

  console.error(`[ERROR] ${statusCode} — ${message}`);
  if (isLocalDev) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isLocalDev && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler for undefined routes.
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND);
  next(error);
};
