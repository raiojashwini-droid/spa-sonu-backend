/**
 * OMEGA SPA POS — Media Routes
 * Phase 23: Cloudinary Media Storage Integration
 */

import { Router, Request, Response, NextFunction } from 'express';
import { mediaController } from './media.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';
import { uploadSingle, uploadCleaningProof, handleMulterError } from '../../middleware/upload';
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

/**
 * Middleware wrapper for multer multiple cleaning proof photos upload
 */
const handleCleaningUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadCleaningProof(req, res, (err: any) => {
    if (err) {
      const message = handleMulterError(err);
      return next(new AppError(message, HTTP_STATUS.BAD_REQUEST));
    }
    next();
  });
};

// All media endpoints require authentication
router.use(authMiddleware);

// Client treatment before/after photo upload
router.post(
  '/upload/client',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  handleUpload,
  (req, res, next) => mediaController.uploadClientMedia(req, res, next)
);

// Attendance photo upload (clock-in / clock-out)
router.post(
  '/upload/attendance',
  handleUpload,
  (req, res, next) => mediaController.uploadAttendancePhoto(req, res, next)
);

// Cleaning proof upload (supports 1 to 10 camera photos)
router.post(
  '/upload/cleaning',
  allowRoles('MANAGER', 'CLEANER'),
  handleCleaningUpload,
  (req, res, next) => mediaController.uploadCleaningPhoto(req, res, next)
);

// Get persistent cleaning records (role-secured: cleaners see own, managers see all)
router.get(
  '/cleaning',
  allowRoles('MANAGER', 'RECEPTION', 'CLEANER'),
  (req, res, next) => mediaController.getCleaningRecords(req, res, next)
);

// Delete cleaning record and Cloudinary images (MANAGER only)
router.delete(
  '/cleaning/:id',
  allowRoles('MANAGER'),
  (req, res, next) => mediaController.deleteCleaningRecord(req, res, next)
);

// Get client media
router.get(
  '/client/:clientId',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => mediaController.getClientMedia(req, res, next)
);

// Delete client media (MANAGER only)
router.delete(
  '/client/:id',
  allowRoles('MANAGER'),
  (req, res, next) => mediaController.deleteClientMedia(req, res, next)
);

// Manual media retention cleanup trigger (MANAGER only)
router.post(
  '/cleanup',
  allowRoles('MANAGER'),
  (req, res, next) => mediaController.triggerMediaCleanup(req, res, next)
);

// Media cleanup system audit logs (MANAGER only)
router.get(
  '/cleanup/audit',
  allowRoles('MANAGER'),
  (req, res, next) => mediaController.getMediaCleanupAuditLogs(req, res, next)
);

export default router;


