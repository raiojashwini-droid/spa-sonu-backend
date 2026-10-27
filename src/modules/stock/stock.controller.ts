import { Request, Response, NextFunction } from 'express';
import { stockService } from './stock.service';
import {
  createStockSchema,
  refillStockSchema,
  updateStockSchema,
  stockQuerySchema,
  stockActivityQuerySchema,
  createRetailProductSchema,
  updateRetailProductSchema,
  refillRetailSchema,
  deductRetailStockSchema,
  createDailyAuditSchema,
  stockDailyAuditQuerySchema,
  reviewDailyAuditSchema,
} from './stock.validation';
import { HTTP_STATUS } from '../../config/constants';
import { AuthContextUser } from './stock.types';

function getParamId(req: Request, key: string = 'id'): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

export class StockController {
  async getServiceStock(req: Request, res: Response, next: NextFunction) {
    try {
      const query = stockQuerySchema.parse(req.query);
      const result = await stockService.getServiceStock(query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStockById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const result = await stockService.getStockById(id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createServiceStock(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createStockSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await stockService.createServiceStock(validated, authUser);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Stock item created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refillStock(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const validated = refillStockSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await stockService.refillStock(id, validated, authUser);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Stock refilled successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const validated = refillStockSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await stockService.adjustStock(id, validated, authUser);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Stock adjusted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const validated = updateStockSchema.parse(req.body);
      const result = await stockService.updateStock(id, validated);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Stock item updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStockActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const query = stockActivityQuerySchema.parse(req.query);
      const authUser = (req as any).user as AuthContextUser;
      const result = await stockService.getStockActivities(query, authUser);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRetailStock(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await stockService.getRetailStock();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createRetailProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createRetailProductSchema.parse(req.body);
      const result = await stockService.createRetailProduct(validated);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Retail product created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRetailProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const validated = updateRetailProductSchema.parse(req.body);
      const result = await stockService.updateRetailProduct(id, validated);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Retail product updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refillRetailProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const validated = refillRetailSchema.parse(req.body);
      const result = await stockService.refillRetailProduct(id, validated);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Retail product stock refilled successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deductRetailStock(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = deductRetailStockSchema.parse(req.body);
      const result = await stockService.deductRetailStock(validated);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Retail product stock deducted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteServiceStock(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const result = await stockService.deleteServiceStock(id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRetailProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const result = await stockService.deleteRetailProduct(id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Daily Stock Photo Audits ─────────────────────────────────────────

  async submitDailyAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createDailyAuditSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await stockService.submitDailyAudit(validated, authUser);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Daily stock photo audit recorded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDailyAudits(req: Request, res: Response, next: NextFunction) {
    try {
      const query = stockDailyAuditQuerySchema.parse(req.query);
      const authUser = (req as any).user as AuthContextUser;
      const result = await stockService.getDailyAudits(query, authUser);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async reviewDailyAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const validated = reviewDailyAuditSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await stockService.reviewDailyAudit(id, validated, authUser);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Daily stock audit reviewed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDailyAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req, 'id');
      const authUser = (req as any).user as AuthContextUser;
      const result = await stockService.deleteDailyAudit(id, authUser);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const stockController = new StockController();
