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
import { CloudinaryUploadResult, AttendancePhotoUploadInput, CleaningRecordCreateInput } from './media.types';
export declare class MediaService {
    /**
     * Helper to check if Cloudinary has real credentials configured
     */
    private checkCloudinaryConfigured;
    /**
     * Uploads an in-memory buffer to Cloudinary using a stream.
     * Never touches local disk.
     */
    uploadBufferToCloudinary(buffer: Buffer, folder: string, options?: {
        publicId?: string;
        tags?: string[];
    }): Promise<CloudinaryUploadResult>;
    /**
     * Upload base64 data URL string directly to Cloudinary (for legacy compatibility).
     */
    uploadBase64ToCloudinary(base64Data: string, folder: string): Promise<CloudinaryUploadResult>;
    /**
     * Deletes an asset from Cloudinary by its publicId.
     */
    deleteFromCloudinary(publicId: string): Promise<boolean>;
    /**
     * Extracts publicId from Cloudinary URL
     */
    extractPublicIdFromUrl(url?: string | null): string | null;
    /**
     * Upload Client treatment Before/After media and persist to MySQL.
     */
    uploadClientMedia(clientId: string, file: Express.Multer.File, data: {
        mediaType: 'BEFORE' | 'AFTER';
        note?: string;
    }, authUser?: {
        id: string;
        role: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        clientId: string;
        mediaType: import(".prisma/client").$Enums.MediaType;
        fileUrl: string;
        publicId: string | null;
        uploadedBy: string | null;
        note: string | null;
    }>;
    /**
     * Upload Attendance photo (Clock-in or Clock-out verification selfie).
     * Persists Cloudinary URL permanently in Attendance.clockInPhoto or clockOutPhoto.
     */
    uploadAttendancePhoto(employeeId: string, file: Express.Multer.File, data: AttendancePhotoUploadInput, authUser?: {
        id: string;
        role: string;
    }): Promise<{
        url: string;
        publicId: string;
        attendance: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AttendanceStatus;
            createdById: string | null;
            date: Date;
            reason: string | null;
            employeeId: string;
            clockInTime: Date | null;
            clockInPhoto: string | null;
            clockOutTime: Date | null;
            clockOutPhoto: string | null;
            workingHours: import("@prisma/client/runtime/library").Decimal | null;
            isManual: boolean;
        };
    }>;
    /**
     * Upload Cleaning proof photo(s) and save permanently in CleaningRecord and CleaningMedia tables.
     * Supports 1 to 10 photos per cleaning entry.
     * Keeps backward compatibility with legacy before/after fields.
     */
    uploadCleaningRecord(cleanerId: string, files: Express.Multer.File[], data: CleaningRecordCreateInput, authUser?: {
        id: string;
        role: string;
    }): Promise<{
        id: string;
        cleanerId: string;
        cleanerName: string;
        area: string;
        photo: string | null;
        beforePhoto: string | null;
        afterPhoto: string | null;
        photos: {
            id: string;
            url: string;
            publicId: string | null;
        }[];
        photoCount: number;
        note: string | null;
        date: string;
        time: string;
        createdAt: Date;
    }>;
    /**
     * Fetch cleaning records from MySQL with role-based filtering.
     * CLEANER role: only sees own records.
     * MANAGER role: sees all records.
     * Handles backward compatibility for legacy records without child CleaningMedia rows.
     */
    getCleaningRecords(cleanerId?: string, authUser?: {
        id: string;
        role: string;
    }, limit?: number): Promise<{
        id: string;
        cleanerId: string;
        cleanerName: string;
        area: string;
        photo: string | null;
        beforePhoto: string | null;
        afterPhoto: string | null;
        photos: {
            id: string;
            url: string;
            publicId?: string | null;
        }[];
        photoCount: number;
        note: string | null;
        date: string;
        time: string;
        createdAt: Date;
    }[]>;
    /**
     * Delete cleaning record and its associated Cloudinary images.
     * Restricted to MANAGER role.
     */
    deleteCleaningRecord(recordId: string, authUser?: {
        id: string;
        role: string;
    }): Promise<boolean>;
    /**
     * Get media for client
     */
    getClientMedia(clientId: string): Promise<{
        id: string;
        createdAt: Date;
        clientId: string;
        mediaType: import(".prisma/client").$Enums.MediaType;
        fileUrl: string;
        publicId: string | null;
        uploadedBy: string | null;
        note: string | null;
    }[]>;
    /**
     * Delete media record and Cloudinary asset
     */
    deleteClientMedia(mediaId: string, authUser?: {
        id: string;
        role: string;
    }): Promise<boolean>;
}
export declare const mediaService: MediaService;
//# sourceMappingURL=media.service.d.ts.map