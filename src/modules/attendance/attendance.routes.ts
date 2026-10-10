/**
 * OMEGA SPA POS — Attendance Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { attendanceController } from './attendance.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';
import { uploadSingle, handleMulterError } from '../../middleware/upload';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';

const router = Router();

/**
 * Middleware wrapper for multer single file upload
 */
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadSingle(req, res, (err: any) => {
    if (err) {
      const message = handleMulterError(err);
      return next(new AppError(message, HTTP_STATUS.BAD_REQUEST));
    }
    next();
  });
};

// All attendance endpoints require authentication
router.use(authMiddleware);

// POST /api/v1/attendance/clock-in — Employee clock in with photo
router.post('/clock-in', handleUpload, (req, res, next) =>
  attendanceController.clockIn(req, res, next)
);

// POST /api/v1/attendance/clock-out — Employee clock out
router.post('/clock-out', handleUpload, (req, res, next) =>
  attendanceController.clockOut(req, res, next)
);

// GET /api/v1/attendance/today — Today's attendance
router.get('/today', (req, res, next) =>
  attendanceController.getToday(req, res, next)
);

// GET /api/v1/attendance — List attendance history
router.get('/', (req, res, next) =>
  attendanceController.getAll(req, res, next)
);

// POST /api/v1/attendance/manual — Manager manual attendance entry / override
router.post('/manual', allowRoles('MANAGER'), handleUpload, (req, res, next) =>
  attendanceController.manualEntry(req, res, next)
);

export default router;
