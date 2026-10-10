import { Router, Request, Response, NextFunction } from 'express';
import { socialController } from './social.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';
import { uploadSocialMedia, handleMulterError } from '../../middleware/upload';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';

const router = Router();

const handleSocialUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadSocialMedia(req, res, (err: any) => {
    if (err) {
      const message = handleMulterError(err);
      return next(new AppError(message, HTTP_STATUS.BAD_REQUEST));
    }
    next();
  });
};

// Require authentication for all social routes
router.use(authMiddleware);

// POST /api/v1/social/upload - Upload photos/videos to Cloudinary for social posts
router.post('/upload', allowRoles('MANAGER', 'RECEPTION'), handleSocialUpload, (req, res, next) =>
  socialController.uploadMedia(req, res, next)
);


// GET /api/v1/social/accounts - View live connected account statuses
router.get('/accounts', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  socialController.getAccounts(req, res, next)
);

// GET /api/v1/social/posts - View all recent posts
router.get('/posts', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  socialController.getPosts(req, res, next)
);

// POST /api/v1/social/posts - Create post (Post Now or Schedule)
router.post('/posts', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  socialController.createPost(req, res, next)
);

// POST /api/v1/social/posts/:id/publish - Publish a scheduled or draft post now
router.post('/posts/:id/publish', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  socialController.publishPostNow(req, res, next)
);

// DELETE /api/v1/social/posts/:id - Delete a post
router.delete('/posts/:id', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  socialController.deletePost(req, res, next)
);

export default router;
