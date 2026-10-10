import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema } from './auth.validation';
import { HTTP_STATUS } from '../../config/constants';
import { sendError } from '../../utils/response';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      const result = await authService.login(validationResult.data);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        token: result.token,
        user: result.user,
        data: {
          token: result.token,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        sendError(res, 'Unauthorized', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const user = await authService.getCurrentUser(req.user.id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        id: user.id,
        email: user.email,
        role: user.role,
        staffProfile: user.staffProfile,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          staffProfile: user.staffProfile,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
