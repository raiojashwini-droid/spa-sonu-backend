import { Response } from 'express';
import { HTTP_STATUS } from '../config/constants';

/**
 * Standard success response helper.
 * Matches the API specification format:
 * { "success": true, "data": {} }
 */
export const sendSuccess = (
  res: Response,
  data: unknown = {},
  statusCode: number = HTTP_STATUS.OK,
  message?: string
): void => {
  res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
  });
};

/**
 * Standard error response helper.
 * Matches the API specification format:
 * { "success": false, "message": "Error message", "errors": [] }
 */
export const sendError = (
  res: Response,
  message: string = 'Internal Server Error',
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errors: unknown[] = []
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
