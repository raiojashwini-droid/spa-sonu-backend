import { Request, Response, NextFunction } from 'express';
import { loyaltyService } from './loyalty.service';
import {
  updateLoyaltySettingsSchema,
  adjustPointsSchema,
  redeemPointsSchema,
  awardRewardSchema,
  rebookingQuerySchema,
} from './loyalty.validation';
import { HTTP_STATUS } from '../../config/constants';
import { AuthContextUser } from './loyalty.types';

function getParamId(req: Request, key: string = 'id'): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

export class LoyaltyController {
  async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await loyaltyService.getSettings();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateLoyaltySettingsSchema.parse(req.body);
      const result = await loyaltyService.updateSettings(validated);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Loyalty settings updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getClientLoyalty(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = getParamId(req, 'clientId');
      const result = await loyaltyService.getClientLoyalty(clientId);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustClientPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = getParamId(req, 'clientId');
      const validated = adjustPointsSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await loyaltyService.adjustClientPoints(clientId, validated, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Loyalty points adjusted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async redeemPointsForInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoiceId = getParamId(req, 'id');
      const validated = redeemPointsSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await loyaltyService.redeemPointsForInvoice(invoiceId, validated, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Loyalty points redeemed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async awardCelebrationReward(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = getParamId(req, 'clientId');
      const validated = awardRewardSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await loyaltyService.awardCelebrationReward(clientId, validated, authUser);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: `${validated.rewardType} celebration reward awarded successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUpcomingCelebrations(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
      const result = await loyaltyService.getUpcomingCelebrations(days);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRebookingClients(req: Request, res: Response, next: NextFunction) {
    try {
      const query = rebookingQuerySchema.parse(req.query);
      const result = await loyaltyService.getRebookingClients(query);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const loyaltyController = new LoyaltyController();
