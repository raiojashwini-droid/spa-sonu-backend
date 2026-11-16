"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.AppError = void 0;
const constants_1 = require("../config/constants");
/**
 * Custom application error class.
 * Extends native Error with HTTP status code support.
 */
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns a standardized JSON response.
 */
const errorHandler = (err, _req, res, _next) => {
    let statusCode = err instanceof AppError ? err.statusCode : constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message = err.message || 'Internal Server Error';
    // Handle Zod validation errors automatically as 400 Bad Request
    if (err.name === 'ZodError' || err.issues || err.errors) {
        statusCode = constants_1.HTTP_STATUS.BAD_REQUEST;
        const issues = err.issues || err.errors || [];
        message = issues.length > 0 ? issues.map((e) => e.message).join(', ') : 'Validation failed';
    }
    else if (err.code === 'P2002') {
        // Prisma unique constraint violation
        statusCode = constants_1.HTTP_STATUS.CONFLICT;
        const target = err.meta?.target;
        const field = Array.isArray(target) ? target.join(', ') : target || 'Field';
        message = `${field} already exists in the system. Please use a unique value.`;
    }
    else if (err.code === 'P2003') {
        // Prisma foreign key constraint failure
        statusCode = constants_1.HTTP_STATUS.BAD_REQUEST;
        message = 'Relational integrity constraint: The referenced record does not exist or is in use.';
    }
    else if (err.code === 'P2025') {
        // Prisma record not found
        statusCode = constants_1.HTTP_STATUS.NOT_FOUND;
        message = err.meta?.cause || 'Requested record was not found.';
    }
    const isLocalDev = process.env.NODE_ENV === 'development' &&
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
exports.errorHandler = errorHandler;
/**
 * 404 Not Found handler for undefined routes.
 */
const notFoundHandler = (req, _res, next) => {
    const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, constants_1.HTTP_STATUS.NOT_FOUND);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.js.map