import { Request, Response, NextFunction } from 'express';
import { jobSeekersService } from './job-seekers.service';
import {
  createJobSeekerSchema,
  updateJobSeekerSchema,
  queryJobSeekersSchema,
} from './job-seekers.validation';
import { sendSuccess, sendError } from '../../utils/response';
import { HTTP_STATUS } from '../../config/constants';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class JobSeekersController {
  async getJobSeekers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = queryJobSeekersSchema.safeParse(req.query);
      const query = validation.success ? validation.data : {};
      const result = await jobSeekersService.listJobSeekers(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getJobSeekerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const candidate = await jobSeekersService.getJobSeekerById(id);
      sendSuccess(res, candidate);
    } catch (error) {
      next(error);
    }
  }

  async createJobSeeker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createJobSeekerSchema.safeParse(req.body);
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

      const createdById = (req as any).user?.id;
      const candidate = await jobSeekersService.createJobSeeker(validation.data, createdById);
      sendSuccess(res, candidate, HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async updateJobSeeker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const validation = updateJobSeekerSchema.safeParse(req.body);
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

      const updated = await jobSeekersService.updateJobSeeker(id, validation.data);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async deleteJobSeeker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const result = await jobSeekersService.deleteJobSeeker(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const jobSeekersController = new JobSeekersController();
