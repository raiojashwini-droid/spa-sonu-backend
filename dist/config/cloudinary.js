"use strict";
/**
 * OMEGA SPA POS — Cloudinary Configuration
 * Phase 23: Media Storage Integration
 *
 * Single source of truth for image/media storage.
 * All uploads go through Cloudinary — no local file storage.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOUDINARY_FOLDERS = void 0;
const cloudinary_1 = require("cloudinary");
const env_1 = require("./env");
cloudinary_1.v2.config({
    cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
    api_key: env_1.env.CLOUDINARY_API_KEY,
    api_secret: env_1.env.CLOUDINARY_API_SECRET,
    secure: true,
});
/**
 * Cloudinary folder structure for Omega Spa
 */
exports.CLOUDINARY_FOLDERS = {
    CLIENT_BEFORE_AFTER: 'omega-spa/clients/before-after',
    ATTENDANCE_LOGIN: 'omega-spa/attendance/login',
    ATTENDANCE_LOGOUT: 'omega-spa/attendance/logout',
    CLEANING_PROOF: 'omega-spa/cleaning/proof',
    STAFF_PROFILE: 'omega-spa/staff/profile',
};
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.js.map