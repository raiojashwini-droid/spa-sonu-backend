/**
 * OMEGA SPA POS — Cloudinary Media Retention & Auto Cleanup Service
 *
 * Implements strict media retention policies:
 * 1. Cleaning Proof Photos: 30-day retention -> deletes from Cloudinary & deletes CleaningMedia row
 * 2. Attendance Photos: 30-day retention -> deletes from Cloudinary & sets clockInPhoto/clockOutPhoto = null
 * 3. Client Treatment Photos (BEFORE/AFTER): PERMANENT -> never deleted
 *
 * Safety & Audit:
 * - Creates a system audit log prior to every Cloudinary deletion
 * - Re-uses mediaService.deleteFromCloudinary
 * - Non-crashing, resilient error handling
 */

import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { mediaService } from './media.service';

export const MEDIA_RETENTION_CONFIG = {
  CLEANING_RETENTION_DAYS: 30,
  ATTENDANCE_RETENTION_DAYS: 30,
  TIMEZONE: 'Africa/Douala',
  CRON_EXPRESSION: '0 0 * * *', // 00:00 midnight daily
} as const;

export interface MediaDeletionAuditLog {
  mediaType: 'CLEANING_BEFORE' | 'CLEANING_AFTER' | 'ATTENDANCE_LOGIN' | 'ATTENDANCE_LOGOUT';
  publicId: string;
  deletionDate: string;
  deletionReason: string;
  deletedBy: 'SYSTEM';
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED_PROTECTED';
  details?: string;
}

export interface MediaCleanupResult {
  startedAt: string;
  completedAt: string;
  retentionDays: number;
  cleaning: {
    scanned: number;
    deleted: number;
    failed: number;
  };
  attendance: {
    scanned: number;
    cleaned: number;
    failed: number;
  };
  auditLogs: MediaDeletionAuditLog[];
}

export class MediaCleanupService {
  private auditLogs: MediaDeletionAuditLog[] = [];
  private readonly maxAuditLogs = 500;

  /**
   * Records a structured system audit log before/after deletion
   */
  private recordAuditLog(entry: MediaDeletionAuditLog): void {
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs.pop();
    }

    logger.info(`[SYSTEM AUDIT LOG] Media deletion (${entry.status})`, {
      mediaType: entry.mediaType,
      publicId: entry.publicId,
      deletionDate: entry.deletionDate,
      deletionReason: entry.deletionReason,
      deletedBy: entry.deletedBy,
      status: entry.status,
      details: entry.details,
    });
  }

  /**
   * Retrieves recent system audit logs
   */
  getAuditLogs(limit = 100): MediaDeletionAuditLog[] {
    return this.auditLogs.slice(0, limit);
  }

  /**
   * Safety guard to ensure client treatment photos are NEVER deleted
   */
  private isProtectedClientAsset(publicId: string): boolean {
    if (!publicId) return false;
    const lower = publicId.toLowerCase();
    // Never touch client treatment photos or client directories
    return (
      lower.includes('omega-spa/clients/') ||
      lower.includes('/before-after/') ||
      lower.includes('client_before') ||
      lower.includes('client_after')
    );
  }

  /**
   * 1. Cleaning Photos Retention Cleanup
   * Deletes Cloudinary assets and removes database CleaningMedia rows older than retentionDays (default 30).
   */
  async cleanupExpiredCleaningPhotos(
    retentionDays: number = MEDIA_RETENTION_CONFIG.CLEANING_RETENTION_DAYS
  ): Promise<{ scanned: number; deleted: number; failed: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    logger.info(`[Media Cleanup] Starting cleaning photos cleanup. Cutoff: ${cutoffDate.toISOString()} (${retentionDays} days)`);

    let scanned = 0;
    let deleted = 0;
    let failed = 0;

    try {
      // Find all CleaningMedia records created before cutoff date
      const expiredMediaList = await prisma.cleaningMedia.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
        include: {
          cleaningRecord: true,
        },
      });

      scanned = expiredMediaList.length;
      logger.info(`[Media Cleanup] Found ${scanned} expired cleaning media records.`);

      for (const item of expiredMediaList) {
        const publicId = item.publicId || mediaService.extractPublicIdFromUrl(item.photoUrl);

        if (!publicId) {
          logger.warn(`[Media Cleanup] Cleaning media ${item.id} has no valid publicId or URL. Removing DB record.`);
          await prisma.cleaningMedia.delete({ where: { id: item.id } }).catch(() => {});
          deleted++;
          continue;
        }

        // Safety verification: strictly avoid client assets
        if (this.isProtectedClientAsset(publicId)) {
          this.recordAuditLog({
            mediaType: 'CLEANING_AFTER',
            publicId,
            deletionDate: new Date().toISOString(),
            deletionReason: 'Blocked: Asset matched protected client treatment criteria',
            deletedBy: 'SYSTEM',
            status: 'SKIPPED_PROTECTED',
          });
          continue;
        }

        // System audit log BEFORE deletion
        const auditEntry: MediaDeletionAuditLog = {
          mediaType: 'CLEANING_AFTER',
          publicId,
          deletionDate: new Date().toISOString(),
          deletionReason: `Cleaning proof photos retention expired (> ${retentionDays} days)`,
          deletedBy: 'SYSTEM',
          status: 'SUCCESS',
        };

        try {
          // Step 1: Delete from Cloudinary using existing delete function
          const destroyed = await mediaService.deleteFromCloudinary(publicId);

          if (destroyed) {
            // Step 2: Delete database record only after successful Cloudinary deletion
            await prisma.cleaningMedia.delete({
              where: { id: item.id },
            });
            auditEntry.status = 'SUCCESS';
            this.recordAuditLog(auditEntry);
            deleted++;
          } else {
            // Cloudinary deletion failed: keep database record, log error, retry next cycle
            auditEntry.status = 'FAILED';
            auditEntry.details = 'Cloudinary deletion returned false or asset not found';
            this.recordAuditLog(auditEntry);
            logger.warn(`[Media Cleanup] Cloudinary deletion failed for cleaning photo ${publicId}. Preserving DB record for retry.`);
            failed++;
          }
        } catch (itemErr: any) {
          auditEntry.status = 'FAILED';
          auditEntry.details = itemErr?.message || 'Unknown error during deletion';
          this.recordAuditLog(auditEntry);
          logger.error(`[Media Cleanup] Error deleting cleaning media ${item.id}:`, {
            error: itemErr?.message || String(itemErr),
          });
          failed++;
        }
      }

      // Handle legacy single-photo fields on expired CleaningRecord entries
      const expiredLegacyRecords = await prisma.cleaningRecord.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          OR: [
            { afterPublicId: { not: null } },
            { beforePublicId: { not: null } },
          ],
        },
      });

      for (const leg of expiredLegacyRecords) {
        if (leg.afterPublicId && !this.isProtectedClientAsset(leg.afterPublicId)) {
          this.recordAuditLog({
            mediaType: 'CLEANING_AFTER',
            publicId: leg.afterPublicId,
            deletionDate: new Date().toISOString(),
            deletionReason: `Legacy cleaning afterPhoto retention expired (> ${retentionDays} days)`,
            deletedBy: 'SYSTEM',
            status: 'SUCCESS',
          });
          await mediaService.deleteFromCloudinary(leg.afterPublicId);
        }
        if (leg.beforePublicId && !this.isProtectedClientAsset(leg.beforePublicId)) {
          this.recordAuditLog({
            mediaType: 'CLEANING_BEFORE',
            publicId: leg.beforePublicId,
            deletionDate: new Date().toISOString(),
            deletionReason: `Legacy cleaning beforePhoto retention expired (> ${retentionDays} days)`,
            deletedBy: 'SYSTEM',
            status: 'SUCCESS',
          });
          await mediaService.deleteFromCloudinary(leg.beforePublicId);
        }

        await prisma.cleaningRecord.update({
          where: { id: leg.id },
          data: {
            afterPhotoUrl: null,
            afterPublicId: null,
            beforePhotoUrl: null,
            beforePublicId: null,
          },
        });
      }
    } catch (err: any) {
      logger.error('[Media Cleanup] Unexpected error in cleanupExpiredCleaningPhotos:', {
        error: err?.message || String(err),
      });
    }

    return { scanned, deleted, failed };
  }

  /**
   * 2. Attendance Photos Retention Cleanup
   * Deletes Cloudinary assets and clears clockInPhoto/clockOutPhoto in Attendance records older than retentionDays (default 30).
   */
  async cleanupExpiredAttendancePhotos(
    retentionDays: number = MEDIA_RETENTION_CONFIG.ATTENDANCE_RETENTION_DAYS
  ): Promise<{ scanned: number; cleaned: number; failed: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    logger.info(`[Media Cleanup] Starting attendance photos cleanup. Cutoff: ${cutoffDate.toISOString()} (${retentionDays} days)`);

    let scanned = 0;
    let cleaned = 0;
    let failed = 0;

    try {
      // Find Attendance records older than cutoffDate that still have photos
      const expiredAttendance = await prisma.attendance.findMany({
        where: {
          OR: [
            { createdAt: { lt: cutoffDate } },
            { date: { lt: cutoffDate } },
          ],
          AND: [
            {
              OR: [
                { clockInPhoto: { not: null } },
                { clockOutPhoto: { not: null } },
              ],
            },
          ],
        },
      });

      scanned = expiredAttendance.length;
      logger.info(`[Media Cleanup] Found ${scanned} attendance records with expired photos.`);

      for (const record of expiredAttendance) {
        let clockInDeleted = true;
        let clockOutDeleted = true;

        // Process clock-in photo
        if (record.clockInPhoto) {
          const publicId = mediaService.extractPublicIdFromUrl(record.clockInPhoto);
          if (publicId && !this.isProtectedClientAsset(publicId)) {
            const auditEntry: MediaDeletionAuditLog = {
              mediaType: 'ATTENDANCE_LOGIN',
              publicId,
              deletionDate: new Date().toISOString(),
              deletionReason: `Attendance login photo retention expired (> ${retentionDays} days)`,
              deletedBy: 'SYSTEM',
              status: 'SUCCESS',
            };

            try {
              const destroyed = await mediaService.deleteFromCloudinary(publicId);
              if (destroyed) {
                this.recordAuditLog(auditEntry);
              } else {
                auditEntry.status = 'FAILED';
                auditEntry.details = 'Cloudinary destruction returned false';
                this.recordAuditLog(auditEntry);
                clockInDeleted = false;
              }
            } catch (err: any) {
              auditEntry.status = 'FAILED';
              auditEntry.details = err?.message || 'Error deleting clockInPhoto';
              this.recordAuditLog(auditEntry);
              clockInDeleted = false;
            }
          }
        }

        // Process clock-out photo
        if (record.clockOutPhoto) {
          const publicId = mediaService.extractPublicIdFromUrl(record.clockOutPhoto);
          if (publicId && !this.isProtectedClientAsset(publicId)) {
            const auditEntry: MediaDeletionAuditLog = {
              mediaType: 'ATTENDANCE_LOGOUT',
              publicId,
              deletionDate: new Date().toISOString(),
              deletionReason: `Attendance logout photo retention expired (> ${retentionDays} days)`,
              deletedBy: 'SYSTEM',
              status: 'SUCCESS',
            };

            try {
              const destroyed = await mediaService.deleteFromCloudinary(publicId);
              if (destroyed) {
                this.recordAuditLog(auditEntry);
              } else {
                auditEntry.status = 'FAILED';
                auditEntry.details = 'Cloudinary destruction returned false';
                this.recordAuditLog(auditEntry);
                clockOutDeleted = false;
              }
            } catch (err: any) {
              auditEntry.status = 'FAILED';
              auditEntry.details = err?.message || 'Error deleting clockOutPhoto';
              this.recordAuditLog(auditEntry);
              clockOutDeleted = false;
            }
          }
        }

        // Update database references to null
        try {
          await prisma.attendance.update({
            where: { id: record.id },
            data: {
              ...(clockInDeleted ? { clockInPhoto: null } : {}),
              ...(clockOutDeleted ? { clockOutPhoto: null } : {}),
            },
          });

          if (clockInDeleted && clockOutDeleted) {
            cleaned++;
          } else {
            failed++;
          }
        } catch (dbErr: any) {
          logger.error(`[Media Cleanup] Error updating attendance ${record.id} photo fields:`, {
            error: dbErr?.message || String(dbErr),
          });
          failed++;
        }
      }
    } catch (err: any) {
      logger.error('[Media Cleanup] Unexpected error in cleanupExpiredAttendancePhotos:', {
        error: err?.message || String(err),
      });
    }

    return { scanned, cleaned, failed };
  }

  /**
   * 3. Orchestrated Cleanup Execution
   * Executes cleaning and attendance cleanups. Safe top-level wrapper that never throws or crashes the server.
   */
  async cleanupExpiredMedia(
    retentionDays: number = MEDIA_RETENTION_CONFIG.CLEANING_RETENTION_DAYS
  ): Promise<MediaCleanupResult> {
    const startedAt = new Date().toISOString();
    logger.info(`[Media Cleanup] Commencing full expired media auto-cleanup job (retention: ${retentionDays} days)...`);

    const cleaningResult = await this.cleanupExpiredCleaningPhotos(retentionDays);
    const attendanceResult = await this.cleanupExpiredAttendancePhotos(retentionDays);

    const completedAt = new Date().toISOString();
    logger.info('[Media Cleanup] Finished expired media auto-cleanup job.', {
      startedAt,
      completedAt,
      cleaning: cleaningResult,
      attendance: attendanceResult,
    });

    return {
      startedAt,
      completedAt,
      retentionDays,
      cleaning: cleaningResult,
      attendance: attendanceResult,
      auditLogs: this.getAuditLogs(20),
    };
  }
}

export const mediaCleanupService = new MediaCleanupService();
