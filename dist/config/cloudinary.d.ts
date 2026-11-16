/**
 * OMEGA SPA POS — Cloudinary Configuration
 * Phase 23: Media Storage Integration
 *
 * Single source of truth for image/media storage.
 * All uploads go through Cloudinary — no local file storage.
 */
import { v2 as cloudinary } from 'cloudinary';
/**
 * Cloudinary folder structure for Omega Spa
 */
export declare const CLOUDINARY_FOLDERS: {
    readonly CLIENT_BEFORE_AFTER: "omega-spa/clients/before-after";
    readonly ATTENDANCE_LOGIN: "omega-spa/attendance/login";
    readonly ATTENDANCE_LOGOUT: "omega-spa/attendance/logout";
    readonly CLEANING_PROOF: "omega-spa/cleaning/proof";
    readonly STAFF_PROFILE: "omega-spa/staff/profile";
};
export default cloudinary;
//# sourceMappingURL=cloudinary.d.ts.map