import { Request, Response, NextFunction } from 'express';
import { socialService } from './social.service';
import { mediaService } from '../media/media.service';
import { HTTP_STATUS } from '../../config/constants';
import { AppError } from '../../middleware/errorHandler';

function getParamId(req: Request, key: string = 'id'): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

export class SocialController {
  async getAccounts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await socialService.getAccounts();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPosts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await socialService.getPosts();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await socialService.createPost(req.body);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async publishPostNow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req, 'id');
      const data = await socialService.publishPostNow(id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req, 'id');
      await socialService.deletePost(id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw new AppError('No files uploaded', HTTP_STATUS.BAD_REQUEST);
      }

      const uploadPromises = files.map((file) =>
        mediaService.uploadBufferToCloudinary(file.buffer, 'omega-spa/social')
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map((r) => r.url);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { urls },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const socialController = new SocialController();
