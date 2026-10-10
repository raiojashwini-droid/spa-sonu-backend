import { Request, Response, NextFunction } from 'express';
import { serviceCompletionService } from './serviceCompletion.service';
import { completeServiceSchema } from './serviceCompletion.validation';
import { HTTP_STATUS } from '../../config/constants';

function getParamId(req: Request): string {
  const { appointmentServiceId } = req.params;
  return Array.isArray(appointmentServiceId) ? appointmentServiceId[0] : appointmentServiceId;
}

export class ServiceCompletionController {
  async completeService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointmentServiceId = getParamId(req);
      const validation = completeServiceSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      const result = await serviceCompletionService.completeService(
        appointmentServiceId,
        validation.data,
        req.user!
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Service completed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getServiceCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointmentServiceId = getParamId(req);
      const result = await serviceCompletionService.getServiceCompletion(
        appointmentServiceId,
        req.user!
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const serviceCompletionController = new ServiceCompletionController();
