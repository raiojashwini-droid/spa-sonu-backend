import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { sendError } from '../utils/response';

export const allowRoles = (...allowedRoles: string[]) => {
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const userRole = String(req.user.role || '').toUpperCase();
    if (!normalizedAllowed.includes(userRole)) {
      sendError(res, 'Access forbidden: insufficient permissions', HTTP_STATUS.FORBIDDEN);
      return;
    }

    next();
  };
};

export const requireRoles = allowRoles;
