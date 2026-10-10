/**
 * OMEGA SPA POS — Media Controller
 * Phase 23: Cloudinary Media Storage Integration
 */

import { Request, Response, NextFunction } from 'express';
import { mediaService } from './media.service';
import { sendSuccess, sendError } from '../../utils/response';
import { HTTP_STATUS } from '../../config/constants';
import { AppError } from '../../middleware/errorHandler';

export class MediaController {
  /**
   * POST /api/v1/media/upload/client
   * Multipart upload for client treatment before/after photo
   */
  async uploadClientMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No image file provided. Field name must be "image"', HTTP_STATUS.BAD_REQUEST);
      }

      const { clientId, mediaType, note } = req.body;
      if (!clientId) {
        throw new AppError('clientId is required', HTTP_STATUS.BAD_REQUEST);
      }

      const validMediaType = (mediaType || '').toUpperCase();
      if (validMediaType !== 'BEFORE' && validMediaType !== 'AFTER') {
        throw new AppError('mediaType must be BEFORE or AFTER', HTTP_STATUS.BAD_REQUEST);
      }

      const media = await mediaService.uploadClientMedia(
        clientId,
        req.file,
        { mediaType: validMediaType, note },
        req.user
      );

      sendSuccess(res, media, HTTP_STATUS.CREATED, 'Client photo uploaded to Cloudinary successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/media/upload/attendance
   * Multipart upload for employee clock-in/out verification photo
   */
  async uploadAttendancePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No image file provided. Field name must be "image"', HTTP_STATUS.BAD_REQUEST);
      }

      const { employeeId, type, date } = req.body;
      const targetType = type === 'clockOut' ? 'clockOut' : 'clockIn';
      const targetEmployeeId = employeeId || req.user?.id;

      if (!targetEmployeeId) {
        throw new AppError('employeeId is required', HTTP_STATUS.BAD_REQUEST);
      }

      const result = await mediaService.uploadAttendancePhoto(
        targetEmployeeId,
        req.file,
        { employeeId: targetEmployeeId, type: targetType, date },
        req.user
      );

      sendSuccess(res, result, HTTP_STATUS.CREATED, 'Attendance photo uploaded to Cloudinary successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/media/upload/cleaning
   * Multipart upload for cleaner proof photo(s)
   * Supports 1 to 10 photos under 'images' or fallback 'image'
   */
  async uploadCleaningPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let files: Express.Multer.File[] = [];

      if (filesObj?.images && filesObj.images.length > 0) {
        files = filesObj.images;
      } else if (filesObj?.photos && filesObj.photos.length > 0) {
        files = filesObj.photos;
      } else if (filesObj?.image && filesObj.image.length > 0) {
        files = filesObj.image;
      } else if (req.file) {
        files = [req.file];
      }


      if (files.length === 0) {
        throw new AppError('No cleaning photos provided. Minimum 1 photo required', HTTP_STATUS.BAD_REQUEST);
      }

      if (files.length > 10) {
        throw new AppError('Maximum 10 photos allowed per cleaning entry', HTTP_STATUS.BAD_REQUEST);
      }

      const { area, taskId, notes, note, slot } = req.body;
      const targetCleanerId = req.user?.id;

      if (!targetCleanerId) {
        throw new AppError('User must be logged in to submit cleaning proof', HTTP_STATUS.UNAUTHORIZED);
      }

      const record = await mediaService.uploadCleaningRecord(
        targetCleanerId,
        files,
        {
          area: area || 'General Cleaning',
          taskId,
          notes: notes || note,
          slot: slot === 'before' ? 'before' : 'after',
        },
        req.user
      );

      sendSuccess(res, record, HTTP_STATUS.CREATED, 'Cleaning proof uploaded and saved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/media/cleaning
   * Get persistent cleaning records (role-secured)
   */
  async getCleaningRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cleanerId = req.query.cleanerId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const records = await mediaService.getCleaningRecords(cleanerId, req.user, limit);
      sendSuccess(res, records);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/media/cleaning/:id
   * Delete cleaning record and its Cloudinary assets (MANAGER only)
   */
  async deleteCleaningRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      await mediaService.deleteCleaningRecord(id, req.user);
      sendSuccess(res, { deleted: true }, HTTP_STATUS.OK, 'Cleaning record deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/media/client/:clientId
   * Get all media for a client
   */
  async getClientMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = String(req.params.clientId);
      const media = await mediaService.getClientMedia(clientId);
      sendSuccess(res, media);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/media/client/:id
   * Delete client media from DB and Cloudinary
   */
  async deleteClientMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      await mediaService.deleteClientMedia(id, req.user);
      sendSuccess(res, { deleted: true }, HTTP_STATUS.OK, 'Media deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/media/cleanup
   * Manually triggers media retention auto-cleanup (MANAGER only)
   */
  async triggerMediaCleanup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const retentionDays = req.body?.retentionDays ? Number(req.body.retentionDays) : 30;
      const { triggerManualCleanup } = await import('./mediaCleanup.scheduler');
      const result = await triggerManualCleanup(retentionDays);
      sendSuccess(res, result, HTTP_STATUS.OK, 'Media auto-cleanup job executed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/media/cleanup/audit
   * Retrieves recent system audit logs for media deletion (MANAGER only)
   */
  async getMediaCleanupAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query?.limit ? Number(req.query.limit) : 100;
      const { mediaCleanupService } = await import('./mediaCleanup.service');
      const logs = mediaCleanupService.getAuditLogs(limit);
      sendSuccess(res, logs);
    } catch (error) {
      next(error);
    }
  }
}

export const mediaController = new MediaController();


