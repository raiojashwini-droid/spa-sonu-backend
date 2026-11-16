/**
 * OMEGA SPA POS — Media Controller
 * Phase 23: Cloudinary Media Storage Integration
 */

import { Request, Response, NextFunction } from 'express';
import { mediaService } from './media.service';
import { sendSuccess, sendError } from '../../utils/response';
import { HTTP_STATUS } from '../../config/constants';
import { AppError } from '../../middleware/errorHandler';

function parseBase64ToMulterFile(raw: any, fieldName = 'images', idx = 0): Express.Multer.File | null {
  if (!raw || typeof raw !== 'string') return null;
  const str = raw.trim();
  if (str === '[object Object]' || str === 'undefined' || str === 'null' || str.length < 50) return null;

  let mimeType = 'image/jpeg';
  let base64Content = str;

  if (str.startsWith('data:')) {
    const commaIdx = str.indexOf(',');
    if (commaIdx !== -1) {
      const meta = str.substring(5, commaIdx);
      const mimeMatch = meta.match(/^([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      base64Content = str.substring(commaIdx + 1);
    }
  }

  base64Content = base64Content.replace(/\s/g, '');
  if (base64Content.length < 50) return null;

  try {
    const buffer = Buffer.from(base64Content, 'base64');
    if (buffer.length === 0) return null;

    const ext = mimeType.split('/')[1] || 'jpg';
    return {
      buffer,
      originalname: `${fieldName}_${Date.now()}_${idx}.${ext}`,
      mimetype: mimeType,
      size: buffer.length,
      fieldname: fieldName,
      encoding: '7bit',
      destination: '',
      filename: `${fieldName}_${Date.now()}_${idx}.${ext}`,
      path: '',
      stream: null as any,
    };
  } catch {
    return null;
  }
}

export class MediaController {
  /**
   * POST /api/v1/media/upload/client
   * Multipart upload for client treatment before/after photo
   */
  async uploadClientMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let file = req.file;
      if (!file) {
        file = parseBase64ToMulterFile(req.body.base64Photo || req.body.photo || req.body.image, 'client') || undefined;
      }

      if (!file) {
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
        file,
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
      let file = req.file;
      if (!file) {
        file = parseBase64ToMulterFile(req.body.base64Photo || req.body.photo || req.body.image, 'attendance') || undefined;
      }

      if (!file) {
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
        file,
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
      let files: Express.Multer.File[] = [];

      if (Array.isArray(req.files) && req.files.length > 0) {
        files = req.files;
      } else if (req.files) {
        const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (filesObj.images && filesObj.images.length > 0) {
          files = filesObj.images;
        } else if (filesObj.photos && filesObj.photos.length > 0) {
          files = filesObj.photos;
        } else if (filesObj.image && filesObj.image.length > 0) {
          files = filesObj.image;
        } else {
          for (const key of Object.keys(filesObj)) {
            if (Array.isArray(filesObj[key])) {
              files.push(...filesObj[key]);
            }
          }
        }
      } else if (req.file) {
        files = [req.file];
      }

      // 1. Filter any valid files received from multer (buffer must be > 100 bytes)
      let validMulterFiles = files.filter((f) => f && f.buffer && f.buffer.length > 100);

      // 2. If multer files are missing or empty/corrupted, check base64 strings in body
      if (validMulterFiles.length === 0) {
        const candidateSources = [
          req.body.base64Images,
          req.body.images,
          req.body.photos,
          req.body.image,
          req.body.photo,
          req.body.beforePhoto,
          req.body.afterPhoto,
        ];

        const rawList: string[] = [];
        for (const item of candidateSources) {
          if (!item) continue;
          if (Array.isArray(item)) {
            rawList.push(...item.filter((x: any) => typeof x === 'string'));
          } else if (typeof item === 'string') {
            if (item.startsWith('[') && item.endsWith(']')) {
              try {
                const parsed = JSON.parse(item);
                if (Array.isArray(parsed)) {
                  rawList.push(...parsed.filter((x: any) => typeof x === 'string'));
                } else {
                  rawList.push(item);
                }
              } catch {
                rawList.push(item);
              }
            } else {
              rawList.push(item);
            }
          }
        }

        const base64Files: Express.Multer.File[] = [];
        rawList.forEach((cand, idx) => {
          const parsed = parseBase64ToMulterFile(cand, 'images', idx);
          if (parsed && parsed.buffer && parsed.buffer.length > 100) {
            base64Files.push(parsed);
          }
        });

        if (base64Files.length > 0) {
          files = base64Files;
        } else {
          files = [];
        }
      } else {
        files = validMulterFiles;
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


