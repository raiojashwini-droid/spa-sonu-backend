import { Response } from 'express';
/**
 * Standard success response helper.
 * Matches the API specification format:
 * { "success": true, "data": {} }
 */
export declare const sendSuccess: (res: Response, data?: unknown, statusCode?: number, message?: string) => void;
/**
 * Standard error response helper.
 * Matches the API specification format:
 * { "success": false, "message": "Error message", "errors": [] }
 */
export declare const sendError: (res: Response, message?: string, statusCode?: number, errors?: unknown[]) => void;
//# sourceMappingURL=response.d.ts.map