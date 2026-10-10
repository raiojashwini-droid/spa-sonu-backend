import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { sendError } from '../utils/response';

export const allowRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'Access forbidden: insufficient permissions', HTTP_STATUS.FORBIDDEN);
      return;
    }

    next();
  };
};

export const requireRoles = allowRoles;
