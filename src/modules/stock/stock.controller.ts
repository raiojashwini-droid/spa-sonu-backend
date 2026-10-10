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
}

export const stockController = new StockController();
