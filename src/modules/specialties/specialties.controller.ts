import { Request, Response, NextFunction } from 'express';
import { specialtiesService } from './specialties.service';
import { createSpecialtySchema, updateSpecialtySchema } from './specialties.validation';
import { sendSuccess, sendError } from '../../utils/response';
import { HTTP_STATUS } from '../../config/constants';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class SpecialtiesController {
  async getSpecialties(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await specialtiesService.getSpecialties();
      sendSuccess(res, list);
    } catch (error) {
      next(error);
    }
  }

  async getSpecialtyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const spec = await specialtiesService.getSpecialtyById(id);
      sendSuccess(res, spec);
    } catch (error) {
      next(error);
    }
  }

  async createSpecialty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createSpecialtySchema.safeParse(req.body);
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

      const spec = await specialtiesService.createSpecialty(validation.data);
      sendSuccess(res, spec, HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async updateSpecialty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const validation = updateSpecialtySchema.safeParse(req.body);
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

      const spec = await specialtiesService.updateSpecialty(id, validation.data);
      sendSuccess(res, spec);
    } catch (error) {
      next(error);
    }
  }

  async deleteSpecialty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      await specialtiesService.deleteSpecialty(id);
      sendSuccess(res, { message: 'Specialty deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const specialtiesController = new SpecialtiesController();
