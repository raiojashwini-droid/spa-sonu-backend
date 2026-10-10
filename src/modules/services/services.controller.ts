import { Request, Response, NextFunction } from 'express';
import { servicesService } from './services.service';
import {
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
} from './services.validation';
import { HTTP_STATUS } from '../../config/constants';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class ServicesController {
  async getServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = serviceQuerySchema.parse(req.query);
      const services = await servicesService.getServices(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: services,
      });
    } catch (error) {
      next(error);
    }
  }

  async getServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const service = await servicesService.getServiceById(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  async createService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createServiceSchema.parse(req.body);
      const service = await servicesService.createService(input);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const input = updateServiceSchema.parse(req.body);
      const service = await servicesService.updateService(id, input);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const result = await servicesService.deleteService(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const servicesController = new ServicesController();
