import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { createUserSchema, updateUserSchema } from './users.validation';
import { sendSuccess, sendError } from '../../utils/response';
import { HTTP_STATUS } from '../../config/constants';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class UsersController {
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await usersService.getUsers();
      sendSuccess(res, users);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const user = await usersService.getUserById(id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(
          res,
          'Validation failed',
          HTTP_STATUS.BAD_REQUEST,
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const user = await usersService.createUser(validation.data);
      sendSuccess(res, user, HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const validation = updateUserSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(
          res,
          'Validation failed',
          HTTP_STATUS.BAD_REQUEST,
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const user = await usersService.updateUser(id, validation.data);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      await usersService.deleteUser(id);
      sendSuccess(res, { message: 'User deactivated successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
