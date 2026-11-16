/**
 * OMEGA SPA POS — Legacy Uploads Route (Redirected to Cloudinary)
 * Phase 23: Media Storage Integration
 *
 * Backward-compatible endpoint for existing callers:
 * Now uploads directly to Cloudinary instead of writing to local disk.
 * Returns { success: true, data: { url: cloudinaryUrl, publicId } }
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=uploads.routes.d.ts.map