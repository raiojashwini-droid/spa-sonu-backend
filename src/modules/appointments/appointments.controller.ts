import { Request, Response, NextFunction } from 'express';
import { appointmentsService } from './appointments.service';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  changeAppointmentStatusSchema,
  appointmentQuerySchema,
} from './appointments.validation';
import { HTTP_STATUS } from '../../config/constants';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class AppointmentsController {
  async createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createAppointmentSchema.safeParse(req.body);
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

      const appointment = await appointmentsService.createAppointment(validation.data, req.user!);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = appointmentQuerySchema.safeParse(req.query);
      const query = validation.success ? validation.data : req.query;

      const result = await appointmentsService.getAppointments(query, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.appointments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAppointmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const appointment = await appointmentsService.getAppointmentById(id, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const validation = updateAppointmentSchema.safeParse(req.body);
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

      const updated = await appointmentsService.updateAppointment(id, validation.data, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async changeAppointmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const validation = changeAppointmentStatusSchema.safeParse(req.body);
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

      const updated = await appointmentsService.changeAppointmentStatus(id, validation.data, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
  async cancelAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const cancelled = await appointmentsService.cancelAppointment(id, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: cancelled,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const appointmentsController = new AppointmentsController();
