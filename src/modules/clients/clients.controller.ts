import { Request, Response, NextFunction } from 'express';
import { clientsService } from './clients.service';
import {
  createClientSchema,
  updateClientSchema,
  updateClientStatusSchema,
  addClientMediaSchema,
  clientQuerySchema,
} from './clients.validation';
import { HTTP_STATUS } from '../../config/constants';


function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class ClientsController {
  async createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createClientSchema.safeParse(req.body);
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

      const client = await clientsService.createClient(validation.data, req.user!);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  async getClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = clientQuerySchema.safeParse(req.query);
      const query = validation.success ? validation.data : req.query;

      const result = await clientsService.getClients(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.clients,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getClientById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const client = await clientsService.getClientById(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const validation = updateClientSchema.safeParse(req.body);
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

      const updated = await clientsService.updateClient(id, validation.data, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async setClientStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const validation = updateClientStatusSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid status provided. Use ACTIVE or INACTIVE',
        });
        return;
      }

      let status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';
      if (validation.data.status) {
        status = validation.data.status.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
      } else if (validation.data.isActive !== undefined) {
        status = validation.data.isActive ? 'ACTIVE' : 'INACTIVE';
      }

      const result = await clientsService.setClientStatus(id, status, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Client status updated to ${status}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const result = await clientsService.activateClient(id, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Client restored to Active successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const result = await clientsService.deactivateClient(id, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Client marked as Inactive successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const result = await clientsService.deactivateClient(id, req.user!);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Client deactivated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }


  async addClientMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const validation = addClientMediaSchema.safeParse(req.body);
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

      const media = await clientsService.addClientMedia(id, validation.data, req.user!);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: media,
      });
    } catch (error) {
      next(error);
    }
  }

  async getClientHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const history = await clientsService.getClientHistory(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const clientsController = new ClientsController();
