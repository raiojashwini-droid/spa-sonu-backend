/**
 * OMEGA SPA POS — Multer Upload Middleware
 * Phase 23: Media Storage Integration
 *
 * Handles multipart/form-data file uploads with:
 * - Memory storage (buffer — no local disk)
 * - MIME type validation (jpg, jpeg, png, webp)
 * - File size limit (5MB)
 * - Rejection of unsafe file types
 */

import multer from 'multer';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const REJECTED_EXTENSIONS = ['.exe', '.zip', '.rar', '.bat', '.sh', '.cmd', '.msi', '.dll'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error(`File type '${file.mimetype}' is not allowed. Allowed types: jpg, jpeg, png, webp`));
    return;
  }

  // Check extension for rejected types
  const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() || '');
  if (REJECTED_EXTENSIONS.includes(ext)) {
    cb(new Error(`File extension '${ext}' is not allowed`));
    return;
  }

  cb(null, true);
};

/**
 * Single image upload middleware
 * Field name: 'image'
 */
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
}).single('image');

/**
 * Multiple images upload middleware for cleaning proofs
 * Accepts 'images' (up to 10) or fallback 'image' (1)
 */
export const uploadCleaningProof = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'photos', maxCount: 10 },
  { name: 'image', maxCount: 1 },
]);

/**
 * Social media photo/video upload middleware (supports up to 10 files)
 */
export const uploadSocialMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
}).array('files', 10);


/**
 * Error handler wrapper for multer errors
 */
export const handleMulterError = (err: any): string => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return 'File too large. Maximum file size is 5MB per image';
      case 'LIMIT_FILE_COUNT':
        return 'Too many files. Maximum 10 photos allowed per cleaning entry';
      case 'LIMIT_UNEXPECTED_FILE':
        return 'Unexpected field name. Use "images" or "image" as the field name';
      default:
        return `Upload error: ${err.message}`;
    }
  }
  return err.message || 'Unknown upload error';
};

