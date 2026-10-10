import { Request, Response, NextFunction } from 'express';
import { commissionsService } from './commissions.service';
import {
  commissionQuerySchema,
  addBonusSchema,
  adjustCommissionSchema,
  setCommissionRuleSchema,
} from './commissions.validation';
import { HTTP_STATUS } from '../../config/constants';
import { AuthContextUser } from './commissions.types';

function getParamId(req: Request, key: string = 'id'): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

export class CommissionsController {
  async getCommissions(req: Request, res: Response, next: NextFunction) {
    try {
      const query = commissionQuerySchema.parse(req.query);
      const authUser = (req as any).user as AuthContextUser;
      const result = await commissionsService.getCommissions(query, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTechnicianCommissions(req: Request, res: Response, next: NextFunction) {
    try {
      const technicianId = getParamId(req, 'technicianId');
      const query = commissionQuerySchema.parse(req.query);
      const authUser = (req as any).user as AuthContextUser;
      const result = await commissionsService.getTechnicianCommissions(technicianId, query, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async addBonus(req: Request, res: Response, next: NextFunction) {
    try {
      const commissionId = getParamId(req, 'id');
      const validated = addBonusSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await commissionsService.addBonus(commissionId, validated, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Bonus awarded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustCommission(req: Request, res: Response, next: NextFunction) {
    try {
      const commissionId = getParamId(req, 'id');
      const validated = adjustCommissionSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await commissionsService.adjustCommission(commissionId, validated, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Commission adjusted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveCommission(req: Request, res: Response, next: NextFunction) {
    try {
      const commissionId = getParamId(req, 'id');
      const authUser = (req as any).user as AuthContextUser;
      const result = await commissionsService.approveCommission(commissionId, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Commission approved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async setCommissionRule(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = setCommissionRuleSchema.parse(req.body);
      const result = await commissionsService.setCommissionRule(validated);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Commission rule saved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCommissionRules(_req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await commissionsService.getCommissionRules();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const commissionsController = new CommissionsController();
