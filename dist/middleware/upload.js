"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMulterError = exports.uploadSocialMedia = exports.uploadCleaningProof = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];
const REJECTED_EXTENSIONS = ['.exe', '.zip', '.rar', '.bat', '.sh', '.cmd', '.msi', '.dll'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const storage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
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
exports.uploadSingle = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
        fieldSize: 25 * 1024 * 1024, // 25MB max field size
    },
}).single('image');
/**
 * Multiple images upload middleware for cleaning proofs
 * Accepts up to 10 photos under any field name ('images', 'photos', 'image', etc.)
 */
exports.uploadCleaningProof = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 10,
        fieldSize: 25 * 1024 * 1024, // 25MB max field size to allow large base64 strings
    },
}).any();
/**
 * Social media photo/video upload middleware (supports up to 10 files)
 */
exports.uploadSocialMedia = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10,
        fieldSize: 25 * 1024 * 1024,
    },
}).array('files', 10);
/**
 * Error handler wrapper for multer errors
 */
const handleMulterError = (err) => {
    if (err instanceof multer_1.default.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return 'File too large. Maximum file size is 5MB per image';
            case 'LIMIT_FILE_COUNT':
                return 'Too many files. Maximum 10 photos allowed per cleaning entry';
            case 'LIMIT_FIELD_VALUE':
                return 'Field value too long. Maximum field size is 25MB';
            case 'LIMIT_UNEXPECTED_FILE':
                return 'Unexpected field name. Use "images" or "image" as the field name';
            default:
                return `Upload error: ${err.message}`;
        }
    }
    return err.message || 'Unknown upload error';
};
exports.handleMulterError = handleMulterError;
//# sourceMappingURL=upload.js.map