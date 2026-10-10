/**
 * OMEGA SPA POS — Legacy Uploads Route (Redirected to Cloudinary)
 * Phase 23: Media Storage Integration
 *
 * Backward-compatible endpoint for existing callers:
 * Now uploads directly to Cloudinary instead of writing to local disk.
 * Returns { success: true, data: { url: cloudinaryUrl, publicId } }
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';
import { HTTP_STATUS } from '../../config/constants';
import { mediaService } from '../media/media.service';
import { CLOUDINARY_FOLDERS } from '../../config/cloudinary';

const router = Router();

// POST /api/v1/uploads — Upload image directly to Cloudinary
router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Image data is required',
      });
      return;
    }

    // Upload directly to Cloudinary
    const result = await mediaService.uploadBase64ToCloudinary(
      image,
      CLOUDINARY_FOLDERS.CLIENT_BEFORE_AFTER
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
