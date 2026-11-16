/**
 * OMEGA SPA POS — Media Controller
 * Phase 23: Cloudinary Media Storage Integration
 */
import { Request, Response, NextFunction } from 'express';
export declare class MediaController {
    /**
     * POST /api/v1/media/upload/client
     * Multipart upload for client treatment before/after photo
     */
    uploadClientMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/v1/media/upload/attendance
     * Multipart upload for employee clock-in/out verification photo
     */
    uploadAttendancePhoto(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/v1/media/upload/cleaning
     * Multipart upload for cleaner proof photo(s)
     * Supports 1 to 10 photos under 'images' or fallback 'image'
     */
    uploadCleaningPhoto(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/media/cleaning
     * Get persistent cleaning records (role-secured)
     */
    getCleaningRecords(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /api/v1/media/cleaning/:id
     * Delete cleaning record and its Cloudinary assets (MANAGER only)
     */
    deleteCleaningRecord(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/media/client/:clientId
     * Get all media for a client
     */
    getClientMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * DELETE /api/v1/media/client/:id
     * Delete client media from DB and Cloudinary
     */
    deleteClientMedia(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/v1/media/cleanup
     * Manually triggers media retention auto-cleanup (MANAGER only)
     */
    triggerMediaCleanup(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/media/cleanup/audit
     * Retrieves recent system audit logs for media deletion (MANAGER only)
     */
    getMediaCleanupAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const mediaController: MediaController;
//# sourceMappingURL=media.controller.d.ts.map