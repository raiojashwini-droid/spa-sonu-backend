"use strict";
/**
 * OMEGA SPA POS — Media Service
 * Phase 23: Cloudinary Media Storage Integration
 *
 * Production-ready media service:
 * - Direct stream upload to Cloudinary (no local disk)
 * - Safe buffer handling via memory storage
 * - Dedicated folders per domain (clients, attendance, cleaning)
 * - Full database persistence in MySQL via Prisma
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaService = exports.MediaService = void 0;
const stream_1 = require("stream");
const cloudinary_1 = __importStar(require("../../config/cloudinary"));
const env_1 = require("../../config/env");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class MediaService {
    /**
     * Helper to check if Cloudinary has real credentials configured
     */
    checkCloudinaryConfigured() {
        if (!env_1.env.CLOUDINARY_CLOUD_NAME ||
            env_1.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name_here' ||
            !env_1.env.CLOUDINARY_API_KEY ||
            env_1.env.CLOUDINARY_API_KEY === 'your_api_key_here') {
            throw new errorHandler_1.AppError('Cloudinary is not configured with valid credentials. Please update CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Uploads an in-memory buffer to Cloudinary using a stream.
     * Never touches local disk.
     */
    async uploadBufferToCloudinary(buffer, folder, options = {}) {
        this.checkCloudinaryConfigured();
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.default.uploader.upload_stream({
                folder,
                public_id: options.publicId,
                tags: options.tags,
                resource_type: 'image',
                transformation: [
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
            }, (error, result) => {
                if (error || !result) {
                    return reject(new errorHandler_1.AppError(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`, constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR));
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    format: result.format,
                    bytes: result.bytes,
                    width: result.width,
                    height: result.height,
                });
            });
            const readableStream = new stream_1.Readable();
            readableStream.push(buffer);
            readableStream.push(null);
            readableStream.pipe(uploadStream);
        });
    }
    /**
     * Upload base64 data URL string directly to Cloudinary (for legacy compatibility).
     */
    async uploadBase64ToCloudinary(base64Data, folder) {
        this.checkCloudinaryConfigured();
        try {
            const result = await cloudinary_1.default.uploader.upload(base64Data, {
                folder,
                resource_type: 'image',
                transformation: [
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
            });
            return {
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                bytes: result.bytes,
                width: result.width,
                height: result.height,
            };
        }
        catch (err) {
            throw new errorHandler_1.AppError(`Cloudinary base64 upload failed: ${err.message || 'Unknown error'}`, constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Deletes an asset from Cloudinary by its publicId.
     */
    async deleteFromCloudinary(publicId) {
        try {
            this.checkCloudinaryConfigured();
            const res = await cloudinary_1.default.uploader.destroy(publicId);
            return res.result === 'ok';
        }
        catch (err) {
            console.warn(`[Cloudinary] Failed to delete publicId: ${publicId}`, err);
            return false;
        }
    }
    /**
     * Extracts publicId from Cloudinary URL
     */
    extractPublicIdFromUrl(url) {
        if (!url || typeof url !== 'string')
            return null;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return url;
        }
        try {
            const parsed = new URL(url);
            const pathname = parsed.pathname;
            const uploadIndex = pathname.indexOf('/upload/');
            if (uploadIndex === -1)
                return null;
            let pathAfterUpload = pathname.substring(uploadIndex + '/upload/'.length);
            pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
            const dotIndex = pathAfterUpload.lastIndexOf('.');
            if (dotIndex !== -1) {
                pathAfterUpload = pathAfterUpload.substring(0, dotIndex);
            }
            return decodeURIComponent(pathAfterUpload);
        }
        catch {
            return null;
        }
    }
    /**
     * Upload Client treatment Before/After media and persist to MySQL.
     */
    async uploadClientMedia(clientId, file, data, authUser) {
        const client = await database_1.default.client.findUnique({ where: { id: clientId } });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // Upload to Cloudinary under omega-spa/clients/before-after
        const uploadResult = await this.uploadBufferToCloudinary(file.buffer, cloudinary_1.CLOUDINARY_FOLDERS.CLIENT_BEFORE_AFTER, {
            tags: [clientId, data.mediaType.toLowerCase()],
        });
        // Save Cloudinary URL + publicId in MySQL
        const media = await database_1.default.clientMedia.create({
            data: {
                clientId,
                mediaType: data.mediaType,
                fileUrl: uploadResult.url,
                publicId: uploadResult.publicId,
                uploadedBy: authUser?.id || null,
                note: data.note ? data.note.trim() : null,
            },
        });
        // Record in client history
        await database_1.default.clientHistory.create({
            data: {
                clientId,
                action: 'MEDIA_ADDED',
                details: `${data.mediaType} photo uploaded to Cloudinary by ${authUser?.role || 'Staff'}`,
                performedBy: authUser?.id || null,
            },
        });
        return media;
    }
    /**
     * Upload Attendance photo (Clock-in or Clock-out verification selfie).
     * Persists Cloudinary URL permanently in Attendance.clockInPhoto or clockOutPhoto.
     */
    async uploadAttendancePhoto(employeeId, file, data, authUser) {
        const targetUserId = employeeId || authUser?.id;
        if (!targetUserId) {
            throw new errorHandler_1.AppError('Employee ID is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const folder = data.type === 'clockIn'
            ? cloudinary_1.CLOUDINARY_FOLDERS.ATTENDANCE_LOGIN
            : cloudinary_1.CLOUDINARY_FOLDERS.ATTENDANCE_LOGOUT;
        const uploadResult = await this.uploadBufferToCloudinary(file.buffer, folder, {
            tags: [targetUserId, data.type],
        });
        // Target date (today or provided)
        const today = data.date ? new Date(data.date) : new Date();
        today.setHours(0, 0, 0, 0);
        let attendance = await database_1.default.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId: targetUserId,
                    date: today,
                },
            },
        });
        if (data.type === 'clockIn') {
            if (attendance) {
                attendance = await database_1.default.attendance.update({
                    where: { id: attendance.id },
                    data: {
                        clockInPhoto: uploadResult.url,
                        clockInTime: attendance.clockInTime || new Date(),
                        status: 'WORKING',
                    },
                });
            }
            else {
                attendance = await database_1.default.attendance.create({
                    data: {
                        employeeId: targetUserId,
                        date: today,
                        clockInPhoto: uploadResult.url,
                        clockInTime: new Date(),
                        status: 'WORKING',
                        createdById: authUser?.id || null,
                    },
                });
            }
        }
        else {
            // Clock Out
            if (!attendance) {
                attendance = await database_1.default.attendance.create({
                    data: {
                        employeeId: targetUserId,
                        date: today,
                        clockOutPhoto: uploadResult.url,
                        clockOutTime: new Date(),
                        status: 'COMPLETED',
                        createdById: authUser?.id || null,
                    },
                });
            }
            else {
                attendance = await database_1.default.attendance.update({
                    where: { id: attendance.id },
                    data: {
                        clockOutPhoto: uploadResult.url,
                        clockOutTime: new Date(),
                        status: 'COMPLETED',
                    },
                });
            }
        }
        return {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            attendance,
        };
    }
    /**
     * Upload Cleaning proof photo(s) and save permanently in CleaningRecord and CleaningMedia tables.
     * Supports 1 to 10 photos per cleaning entry.
     * Keeps backward compatibility with legacy before/after fields.
     */
    async uploadCleaningRecord(cleanerId, files, data, authUser) {
        const targetCleanerId = cleanerId || authUser?.id;
        if (!targetCleanerId) {
            throw new errorHandler_1.AppError('Cleaner ID is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (!files || files.length === 0) {
            throw new errorHandler_1.AppError('Minimum 1 photo required for cleaning proof', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (files.length > 10) {
            throw new errorHandler_1.AppError('Maximum 10 photos allowed per cleaning entry', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Upload each image to Cloudinary in omega-spa/cleaning/proof/
        const uploadResults = await Promise.all(files.map((file) => this.uploadBufferToCloudinary(file.buffer, cloudinary_1.CLOUDINARY_FOLDERS.CLEANING_PROOF, {
            tags: [targetCleanerId, 'cleaning'],
        })));
        const primaryPhoto = uploadResults[0];
        // Create CleaningRecord and child CleaningMedia rows in MySQL
        const record = await database_1.default.cleaningRecord.create({
            data: {
                area: data.area || 'General Cleaning',
                taskId: data.taskId || null,
                cleanerId: targetCleanerId,
                // Populate legacy fields for backward compatibility
                afterPhotoUrl: primaryPhoto?.url || null,
                afterPublicId: primaryPhoto?.publicId || null,
                notes: data.notes ? data.notes.trim() : null,
                status: 'COMPLETED',
                media: {
                    create: uploadResults.map((u) => ({
                        photoUrl: u.url,
                        publicId: u.publicId,
                        uploadedBy: targetCleanerId,
                    })),
                },
            },
            include: {
                cleaner: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
                media: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        const now = record.createdAt;
        const dateStr = now.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const mediaList = record.media.map((m) => ({
            id: m.id,
            url: m.photoUrl,
            publicId: m.publicId,
        }));
        return {
            id: record.id,
            cleanerId: record.cleanerId,
            cleanerName: record.cleaner?.staffProfile?.name || record.cleaner?.email || 'Cleaner',
            area: record.area,
            photo: primaryPhoto?.url || record.afterPhotoUrl || record.beforePhotoUrl,
            beforePhoto: record.beforePhotoUrl,
            afterPhoto: record.afterPhotoUrl,
            photos: mediaList,
            photoCount: mediaList.length,
            note: record.notes,
            date: dateStr,
            time: timeStr,
            createdAt: record.createdAt,
        };
    }
    /**
     * Fetch cleaning records from MySQL with role-based filtering.
     * CLEANER role: only sees own records.
     * MANAGER role: sees all records.
     * Handles backward compatibility for legacy records without child CleaningMedia rows.
     */
    async getCleaningRecords(cleanerId, authUser, limit = 100) {
        let effectiveCleanerId = cleanerId;
        // Enforce role isolation: CLEANER and TECHNICIAN can only view their own submissions
        if (authUser?.role === 'CLEANER' || authUser?.role === 'TECHNICIAN') {
            effectiveCleanerId = authUser.id;
        }
        const records = await database_1.default.cleaningRecord.findMany({
            where: effectiveCleanerId ? { cleanerId: effectiveCleanerId } : {},
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                cleaner: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
                media: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        return records.map((r) => {
            const now = r.createdAt;
            const dateStr = now.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
            const timeStr = now.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
            });
            // Assemble photo gallery with backwards compatibility
            let photos = [];
            if (r.media && r.media.length > 0) {
                photos = r.media.map((m) => ({
                    id: m.id,
                    url: m.photoUrl,
                    publicId: m.publicId,
                }));
            }
            else if (r.afterPhotoUrl || r.beforePhotoUrl) {
                // Backward compatibility fallback for pre-existing single-photo records
                if (r.beforePhotoUrl) {
                    photos.push({ id: `legacy-before-${r.id}`, url: r.beforePhotoUrl, publicId: r.beforePublicId });
                }
                if (r.afterPhotoUrl) {
                    photos.push({ id: `legacy-after-${r.id}`, url: r.afterPhotoUrl, publicId: r.afterPublicId });
                }
            }
            const primaryPhoto = photos[0]?.url || r.afterPhotoUrl || r.beforePhotoUrl || null;
            return {
                id: r.id,
                cleanerId: r.cleanerId,
                cleanerName: r.cleaner?.staffProfile?.name || r.cleaner?.email || 'Cleaner',
                area: r.area,
                photo: primaryPhoto,
                beforePhoto: r.beforePhotoUrl,
                afterPhoto: r.afterPhotoUrl,
                photos,
                photoCount: photos.length,
                note: r.notes || (r.area && r.area !== 'General Cleaning' ? r.area : null),
                date: dateStr,
                time: timeStr,
                createdAt: r.createdAt,
            };
        });
    }
    /**
     * Delete cleaning record and its associated Cloudinary images.
     * Restricted to MANAGER role.
     */
    async deleteCleaningRecord(recordId, authUser) {
        if (authUser?.role !== 'MANAGER') {
            throw new errorHandler_1.AppError('Only managers can delete cleaning records', constants_1.HTTP_STATUS.FORBIDDEN);
        }
        const record = await database_1.default.cleaningRecord.findUnique({
            where: { id: recordId },
            include: { media: true },
        });
        if (!record) {
            throw new errorHandler_1.AppError('Cleaning record not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // Delete photos from Cloudinary
        for (const item of record.media) {
            if (item.publicId) {
                await this.deleteFromCloudinary(item.publicId);
            }
        }
        if (record.afterPublicId) {
            await this.deleteFromCloudinary(record.afterPublicId);
        }
        if (record.beforePublicId) {
            await this.deleteFromCloudinary(record.beforePublicId);
        }
        // Delete record from DB (cascades to CleaningMedia)
        await database_1.default.cleaningRecord.delete({ where: { id: recordId } });
        return true;
    }
    /**
     * Get media for client
     */
    async getClientMedia(clientId) {
        return database_1.default.clientMedia.findMany({
            where: { clientId },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Delete media record and Cloudinary asset
     */
    async deleteClientMedia(mediaId, authUser) {
        const media = await database_1.default.clientMedia.findUnique({ where: { id: mediaId } });
        if (!media) {
            throw new errorHandler_1.AppError('Media not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        if (media.publicId) {
            await this.deleteFromCloudinary(media.publicId);
        }
        await database_1.default.clientMedia.delete({ where: { id: mediaId } });
        await database_1.default.clientHistory.create({
            data: {
                clientId: media.clientId,
                action: 'MEDIA_DELETED',
                details: `${media.mediaType} photo deleted by ${authUser?.role || 'Staff'}`,
                performedBy: authUser?.id || null,
            },
        });
        return true;
    }
}
exports.MediaService = MediaService;
exports.mediaService = new MediaService();
//# sourceMappingURL=media.service.js.map