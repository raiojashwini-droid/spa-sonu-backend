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

import { Readable } from 'stream';
import cloudinary, { CLOUDINARY_FOLDERS } from '../../config/cloudinary';
import { env } from '../../config/env';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import {
  CloudinaryUploadResult,
  ClientMediaUploadInput,
  AttendancePhotoUploadInput,
  CleaningRecordCreateInput,
} from './media.types';

export class MediaService {
  /**
   * Helper to check if Cloudinary has real credentials configured
   */
  private checkCloudinaryConfigured(): void {
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name_here' ||
      !env.CLOUDINARY_API_KEY ||
      env.CLOUDINARY_API_KEY === 'your_api_key_here'
    ) {
      throw new AppError(
        'Cloudinary is not configured with valid credentials. Please update CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Uploads an in-memory buffer to Cloudinary using a stream.
   * Never touches local disk.
   */
  async uploadBufferToCloudinary(
    buffer: Buffer,
    folder: string,
    options: {
      publicId?: string;
      tags?: string[];
    } = {}
  ): Promise<CloudinaryUploadResult> {
    this.checkCloudinaryConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: options.publicId,
          tags: options.tags,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new AppError(
                `Cloudinary upload failed: ${error?.message || 'Unknown error'}`,
                HTTP_STATUS.INTERNAL_SERVER_ERROR
              )
            );
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        }
      );

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Upload base64 data URL string directly to Cloudinary (for legacy compatibility).
   */
  async uploadBase64ToCloudinary(
    base64Data: string,
    folder: string
  ): Promise<CloudinaryUploadResult> {
    this.checkCloudinaryConfigured();

    try {
      const result = await cloudinary.uploader.upload(base64Data, {
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
    } catch (err: any) {
      throw new AppError(
        `Cloudinary base64 upload failed: ${err.message || 'Unknown error'}`,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Deletes an asset from Cloudinary by its publicId.
   */
  async deleteFromCloudinary(publicId: string): Promise<boolean> {
    try {
      this.checkCloudinaryConfigured();
      const res = await cloudinary.uploader.destroy(publicId);
      return res.result === 'ok';
    } catch (err) {
      console.warn(`[Cloudinary] Failed to delete publicId: ${publicId}`, err);
      return false;
    }
  }

  /**
   * Extracts publicId from Cloudinary URL
   */
  extractPublicIdFromUrl(url?: string | null): string | null {
    if (!url || typeof url !== 'string') return null;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const uploadIndex = pathname.indexOf('/upload/');
      if (uploadIndex === -1) return null;
      let pathAfterUpload = pathname.substring(uploadIndex + '/upload/'.length);
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
      const dotIndex = pathAfterUpload.lastIndexOf('.');
      if (dotIndex !== -1) {
        pathAfterUpload = pathAfterUpload.substring(0, dotIndex);
      }
      return decodeURIComponent(pathAfterUpload);
    } catch {
      return null;
    }
  }


  /**
   * Upload Client treatment Before/After media and persist to MySQL.
   */
  async uploadClientMedia(
    clientId: string,
    file: Express.Multer.File,
    data: { mediaType: 'BEFORE' | 'AFTER'; note?: string },
    authUser?: { id: string; role: string }
  ) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new AppError('Client not found', HTTP_STATUS.NOT_FOUND);
    }

    // Upload to Cloudinary under omega-spa/clients/before-after
    const uploadResult = await this.uploadBufferToCloudinary(
      file.buffer,
      CLOUDINARY_FOLDERS.CLIENT_BEFORE_AFTER,
      {
        tags: [clientId, data.mediaType.toLowerCase()],
      }
    );

    // Save Cloudinary URL + publicId in MySQL
    const media = await prisma.clientMedia.create({
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
    await prisma.clientHistory.create({
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
  async uploadAttendancePhoto(
    employeeId: string,
    file: Express.Multer.File,
    data: AttendancePhotoUploadInput,
    authUser?: { id: string; role: string }
  ) {
    const targetUserId = employeeId || authUser?.id;
    if (!targetUserId) {
      throw new AppError('Employee ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    const folder =
      data.type === 'clockIn'
        ? CLOUDINARY_FOLDERS.ATTENDANCE_LOGIN
        : CLOUDINARY_FOLDERS.ATTENDANCE_LOGOUT;

    const uploadResult = await this.uploadBufferToCloudinary(file.buffer, folder, {
      tags: [targetUserId, data.type],
    });

    // Target date (today or provided)
    const today = data.date ? new Date(data.date) : new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: targetUserId,
          date: today,
        },
      },
    });

    if (data.type === 'clockIn') {
      if (attendance) {
        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            clockInPhoto: uploadResult.url,
            clockInTime: attendance.clockInTime || new Date(),
            status: 'WORKING',
          },
        });
      } else {
        attendance = await prisma.attendance.create({
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
    } else {
      // Clock Out
      if (!attendance) {
        attendance = await prisma.attendance.create({
          data: {
            employeeId: targetUserId,
            date: today,
            clockOutPhoto: uploadResult.url,
            clockOutTime: new Date(),
            status: 'COMPLETED',
            createdById: authUser?.id || null,
          },
        });
      } else {
        attendance = await prisma.attendance.update({
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
  async uploadCleaningRecord(
    cleanerId: string,
    files: Express.Multer.File[],
    data: CleaningRecordCreateInput,
    authUser?: { id: string; role: string }
  ) {
    const targetCleanerId = cleanerId || authUser?.id;
    if (!targetCleanerId) {
      throw new AppError('Cleaner ID is required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!files || files.length === 0) {
      throw new AppError('Minimum 1 photo required for cleaning proof', HTTP_STATUS.BAD_REQUEST);
    }

    if (files.length > 10) {
      throw new AppError('Maximum 10 photos allowed per cleaning entry', HTTP_STATUS.BAD_REQUEST);
    }

    // Upload each image to Cloudinary in omega-spa/cleaning/proof/
    const uploadResults = await Promise.all(
      files.map((file) =>
        this.uploadBufferToCloudinary(file.buffer, CLOUDINARY_FOLDERS.CLEANING_PROOF, {
          tags: [targetCleanerId, 'cleaning'],
        })
      )
    );

    const primaryPhoto = uploadResults[0];

    // Create CleaningRecord and child CleaningMedia rows in MySQL
    const record = await prisma.cleaningRecord.create({
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
  async getCleaningRecords(
    cleanerId?: string,
    authUser?: { id: string; role: string },
    limit = 100
  ) {
    let effectiveCleanerId = cleanerId;

    // Enforce role isolation: CLEANER can only view their own submissions
    if (authUser?.role === 'CLEANER') {
      effectiveCleanerId = authUser.id;
    }

    const records = await prisma.cleaningRecord.findMany({
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
      let photos: { id: string; url: string; publicId?: string | null }[] = [];
      if (r.media && r.media.length > 0) {
        photos = r.media.map((m) => ({
          id: m.id,
          url: m.photoUrl,
          publicId: m.publicId,
        }));
      } else if (r.afterPhotoUrl || r.beforePhotoUrl) {
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
  async deleteCleaningRecord(recordId: string, authUser?: { id: string; role: string }) {
    if (authUser?.role !== 'MANAGER') {
      throw new AppError('Only managers can delete cleaning records', HTTP_STATUS.FORBIDDEN);
    }

    const record = await prisma.cleaningRecord.findUnique({
      where: { id: recordId },
      include: { media: true },
    });

    if (!record) {
      throw new AppError('Cleaning record not found', HTTP_STATUS.NOT_FOUND);
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
    await prisma.cleaningRecord.delete({ where: { id: recordId } });

    return true;
  }

  /**
   * Get media for client
   */
  async getClientMedia(clientId: string) {
    return prisma.clientMedia.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete media record and Cloudinary asset
   */
  async deleteClientMedia(mediaId: string, authUser?: { id: string; role: string }) {
    const media = await prisma.clientMedia.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new AppError('Media not found', HTTP_STATUS.NOT_FOUND);
    }

    if (media.publicId) {
      await this.deleteFromCloudinary(media.publicId);
    }

    await prisma.clientMedia.delete({ where: { id: mediaId } });

    await prisma.clientHistory.create({
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

export const mediaService = new MediaService();

