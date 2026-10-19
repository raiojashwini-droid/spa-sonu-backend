/**
 * OMEGA SPA POS — Penalties & Conduct Rules Controller
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */

import { Request, Response, NextFunction } from 'express';
import { penaltiesService } from './penalties.service';
import { sendSuccess } from '../../utils/response';
import { HTTP_STATUS, ROLES } from '../../config/constants';
import { AppError } from '../../middleware/errorHandler';

class PenaltiesController {
  /**
   * GET /api/v1/penalties/rules
   * Fetch standard conduct rules catalog with recommended penalty amounts
   */
  async getRules(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = penaltiesService.getStandardRules();
      sendSuccess(res, rules, HTTP_STATUS.OK, 'Conduct rules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/penalties
   * Record a new disciplinary infraction penalty (Manager only)
   */
  async createPenalty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const managerId = req.user?.id;
      if (!managerId) {
        throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
      }

      const { staffId, ruleName, penaltyAmount, date, notes } = req.body;

      if (!staffId) {
        throw new AppError('staffId is required', HTTP_STATUS.BAD_REQUEST);
      }

      const record = await penaltiesService.createPenalty({
        staffId,
        ruleName,
        penaltyAmount,
        date,
        notes,
        recordedById: managerId,
      });

      sendSuccess(res, record, HTTP_STATUS.CREATED, 'Penalty recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/penalties
   * Retrieve penalty records
   * - Manager: Can view all staff penalties or filter by staffId/date/month
   * - Non-Manager: Strictly scoped to their own penalties only
   */
  async getPenalties(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = req.user;
      if (!authUser) {
        throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
      }

      const { date, startDate, endDate, month } = req.query;
      let targetStaffId = req.query.staffId as string | undefined;

      // Scoping: Non-managers can only view their own penalties
      if (authUser.role !== ROLES.MANAGER) {
        targetStaffId = authUser.id;
      }

      const result = await penaltiesService.getPenalties({
        staffId: targetStaffId,
        date: typeof date === 'string' ? date : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
        month: typeof month === 'string' ? month : undefined,
      });

      sendSuccess(res, result, HTTP_STATUS.OK, 'Penalties retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/penalties/:id
   * Void / delete a mistaken penalty record (Manager only)
   */
  async deletePenalty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || typeof id !== 'string') {
        throw new AppError('Penalty ID is required', HTTP_STATUS.BAD_REQUEST);
      }

      const result = await penaltiesService.deletePenalty(id);
      sendSuccess(res, result, HTTP_STATUS.OK, 'Penalty deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const penaltiesController = new PenaltiesController();
