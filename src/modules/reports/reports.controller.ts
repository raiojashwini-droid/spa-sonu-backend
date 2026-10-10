import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import {
  dateRangeQuerySchema,
  topServicesQuerySchema,
  technicianReportQuerySchema,
} from './reports.validation';
import { HTTP_STATUS } from '../../config/constants';
import { AuthContextUser } from './reports.types';

function getParamId(req: Request, key: string = 'id'): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

export class ReportsController {
  async getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = dateRangeQuerySchema.parse(req.query);
      const authUser = (req as any).user as AuthContextUser;
      const result = await reportsService.getDashboardSummary(query, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = dateRangeQuerySchema.parse(req.query);
      const result = await reportsService.getRevenueReport(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAppointmentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = dateRangeQuerySchema.parse(req.query);
      const result = await reportsService.getAppointmentAnalytics(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = topServicesQuerySchema.parse(req.query);
      const result = await reportsService.getTopServices(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTechniciansPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = technicianReportQuerySchema.parse(req.query);
      const authUser = (req as any).user as AuthContextUser;
      const result = await reportsService.getTechnicianPerformance(query, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyTechnicianPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = dateRangeQuerySchema.parse(req.query);
      const authUser = (req as any).user as AuthContextUser;
      const result = await reportsService.getTechnicianPerformance(
        { ...query, technicianId: authUser.id },
        authUser
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.technicians[0] || null,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTechnicianById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req, 'id');
      const query = dateRangeQuerySchema.parse(req.query);
      const authUser = (req as any).user as AuthContextUser;
      const result = await reportsService.getTechnicianPerformance(
        { ...query, technicianId: id },
        authUser
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.technicians[0] || null,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStockConsumptionReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = dateRangeQuerySchema.parse(req.query);
      const result = await reportsService.getStockConsumptionReport(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = dateRangeQuerySchema.parse(req.query);
      const result = await reportsService.getCustomerAnalytics(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
