/**
 * OMEGA SPA POS — Cloudinary Configuration
 * Phase 23: Media Storage Integration
 *
 * Single source of truth for image/media storage.
 * All uploads go through Cloudinary — no local file storage.
 */

import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Cloudinary folder structure for Omega Spa
 */
export const CLOUDINARY_FOLDERS = {
  CLIENT_BEFORE_AFTER: 'omega-spa/clients/before-after',
  ATTENDANCE_LOGIN: 'omega-spa/attendance/login',
  ATTENDANCE_LOGOUT: 'omega-spa/attendance/logout',
  CLEANING_PROOF: 'omega-spa/cleaning/proof',
  STAFF_PROFILE: 'omega-spa/staff/profile',
} as const;

export default cloudinary;
