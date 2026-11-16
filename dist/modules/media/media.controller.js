"use strict";
/**
 * OMEGA SPA POS — Media Controller
 * Phase 23: Cloudinary Media Storage Integration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaController = exports.MediaController = void 0;
const media_service_1 = require("./media.service");
const response_1 = require("../../utils/response");
const constants_1 = require("../../config/constants");
const errorHandler_1 = require("../../middleware/errorHandler");
function parseBase64ToMulterFile(raw, fieldName = 'images', idx = 0) {
    if (!raw || typeof raw !== 'string')
        return null;
    const str = raw.trim();
    if (str === '[object Object]' || str === 'undefined' || str === 'null' || str.length < 50)
        return null;
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
    if (base64Content.length < 50)
        return null;
    try {
        const buffer = Buffer.from(base64Content, 'base64');
        if (buffer.length === 0)
            return null;
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
            stream: null,
        };
    }
    catch {
        return null;
    }
}
class MediaController {
    /**
     * POST /api/v1/media/upload/client
     * Multipart upload for client treatment before/after photo
     */
    async uploadClientMedia(req, res, next) {
        try {
            let file = req.file;
            if (!file) {
                file = parseBase64ToMulterFile(req.body.base64Photo || req.body.photo || req.body.image, 'client') || undefined;
            }
            if (!file) {
                throw new errorHandler_1.AppError('No image file provided. Field name must be "image"', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const { clientId, mediaType, note } = req.body;
            if (!clientId) {
                throw new errorHandler_1.AppError('clientId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const validMediaType = (mediaType || '').toUpperCase();
            if (validMediaType !== 'BEFORE' && validMediaType !== 'AFTER') {
                throw new errorHandler_1.AppError('mediaType must be BEFORE or AFTER', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const media = await media_service_1.mediaService.uploadClientMedia(clientId, file, { mediaType: validMediaType, note }, req.user);
            (0, response_1.sendSuccess)(res, media, constants_1.HTTP_STATUS.CREATED, 'Client photo uploaded to Cloudinary successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/v1/media/upload/attendance
     * Multipart upload for employee clock-in/out verification photo
     */
    async uploadAttendancePhoto(req, res, next) {
        try {
            let file = req.file;
            if (!file) {
                file = parseBase64ToMulterFile(req.body.base64Photo || req.body.photo || req.body.image, 'attendance') || undefined;
            }
            if (!file) {
                throw new errorHandler_1.AppError('No image file provided. Field name must be "image"', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const { employeeId, type, date } = req.body;
            const targetType = type === 'clockOut' ? 'clockOut' : 'clockIn';
            const targetEmployeeId = employeeId || req.user?.id;
            if (!targetEmployeeId) {
                throw new errorHandler_1.AppError('employeeId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const result = await media_service_1.mediaService.uploadAttendancePhoto(targetEmployeeId, file, { employeeId: targetEmployeeId, type: targetType, date }, req.user);
            (0, response_1.sendSuccess)(res, result, constants_1.HTTP_STATUS.CREATED, 'Attendance photo uploaded to Cloudinary successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/v1/media/upload/cleaning
     * Multipart upload for cleaner proof photo(s)
     * Supports 1 to 10 photos under 'images' or fallback 'image'
     */
    async uploadCleaningPhoto(req, res, next) {
        try {
            let files = [];
            if (Array.isArray(req.files) && req.files.length > 0) {
                files = req.files;
            }
            else if (req.files) {
                const filesObj = req.files;
                if (filesObj.images && filesObj.images.length > 0) {
                    files = filesObj.images;
                }
                else if (filesObj.photos && filesObj.photos.length > 0) {
                    files = filesObj.photos;
                }
                else if (filesObj.image && filesObj.image.length > 0) {
                    files = filesObj.image;
                }
                else {
                    for (const key of Object.keys(filesObj)) {
                        if (Array.isArray(filesObj[key])) {
                            files.push(...filesObj[key]);
                        }
                    }
                }
            }
            else if (req.file) {
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
                const rawList = [];
                for (const item of candidateSources) {
                    if (!item)
                        continue;
                    if (Array.isArray(item)) {
                        rawList.push(...item.filter((x) => typeof x === 'string'));
                    }
                    else if (typeof item === 'string') {
                        if (item.startsWith('[') && item.endsWith(']')) {
                            try {
                                const parsed = JSON.parse(item);
                                if (Array.isArray(parsed)) {
                                    rawList.push(...parsed.filter((x) => typeof x === 'string'));
                                }
                                else {
                                    rawList.push(item);
                                }
                            }
                            catch {
                                rawList.push(item);
                            }
                        }
                        else {
                            rawList.push(item);
                        }
                    }
                }
                const base64Files = [];
                rawList.forEach((cand, idx) => {
                    const parsed = parseBase64ToMulterFile(cand, 'images', idx);
                    if (parsed && parsed.buffer && parsed.buffer.length > 100) {
                        base64Files.push(parsed);
                    }
                });
                if (base64Files.length > 0) {
                    files = base64Files;
                }
                else {
                    files = [];
                }
            }
            else {
                files = validMulterFiles;
            }
            if (files.length === 0) {
                throw new errorHandler_1.AppError('No cleaning photos provided. Minimum 1 photo required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            if (files.length > 10) {
                throw new errorHandler_1.AppError('Maximum 10 photos allowed per cleaning entry', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const { area, taskId, notes, note, slot } = req.body;
            const targetCleanerId = req.user?.id;
            if (!targetCleanerId) {
                throw new errorHandler_1.AppError('User must be logged in to submit cleaning proof', constants_1.HTTP_STATUS.UNAUTHORIZED);
            }
            const record = await media_service_1.mediaService.uploadCleaningRecord(targetCleanerId, files, {
                area: area || 'General Cleaning',
                taskId,
                notes: notes || note,
                slot: slot === 'before' ? 'before' : 'after',
            }, req.user);
            (0, response_1.sendSuccess)(res, record, constants_1.HTTP_STATUS.CREATED, 'Cleaning proof uploaded and saved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/media/cleaning
     * Get persistent cleaning records (role-secured)
     */
    async getCleaningRecords(req, res, next) {
        try {
            const cleanerId = req.query.cleanerId;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
            const records = await media_service_1.mediaService.getCleaningRecords(cleanerId, req.user, limit);
            (0, response_1.sendSuccess)(res, records);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/v1/media/cleaning/:id
     * Delete cleaning record and its Cloudinary assets (MANAGER only)
     */
    async deleteCleaningRecord(req, res, next) {
        try {
            const id = String(req.params.id);
            await media_service_1.mediaService.deleteCleaningRecord(id, req.user);
            (0, response_1.sendSuccess)(res, { deleted: true }, constants_1.HTTP_STATUS.OK, 'Cleaning record deleted successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/media/client/:clientId
     * Get all media for a client
     */
    async getClientMedia(req, res, next) {
        try {
            const clientId = String(req.params.clientId);
            const media = await media_service_1.mediaService.getClientMedia(clientId);
            (0, response_1.sendSuccess)(res, media);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/v1/media/client/:id
     * Delete client media from DB and Cloudinary
     */
    async deleteClientMedia(req, res, next) {
        try {
            const id = String(req.params.id);
            await media_service_1.mediaService.deleteClientMedia(id, req.user);
            (0, response_1.sendSuccess)(res, { deleted: true }, constants_1.HTTP_STATUS.OK, 'Media deleted successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/v1/media/cleanup
     * Manually triggers media retention auto-cleanup (MANAGER only)
     */
    async triggerMediaCleanup(req, res, next) {
        try {
            const retentionDays = req.body?.retentionDays ? Number(req.body.retentionDays) : 30;
            const { triggerManualCleanup } = await Promise.resolve().then(() => __importStar(require('./mediaCleanup.scheduler')));
            const result = await triggerManualCleanup(retentionDays);
            (0, response_1.sendSuccess)(res, result, constants_1.HTTP_STATUS.OK, 'Media auto-cleanup job executed successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/media/cleanup/audit
     * Retrieves recent system audit logs for media deletion (MANAGER only)
     */
    async getMediaCleanupAuditLogs(req, res, next) {
        try {
            const limit = req.query?.limit ? Number(req.query.limit) : 100;
            const { mediaCleanupService } = await Promise.resolve().then(() => __importStar(require('./mediaCleanup.service')));
            const logs = mediaCleanupService.getAuditLogs(limit);
            (0, response_1.sendSuccess)(res, logs);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MediaController = MediaController;
exports.mediaController = new MediaController();
//# sourceMappingURL=media.controller.js.map