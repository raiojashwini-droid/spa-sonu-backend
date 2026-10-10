import { Request, Response, NextFunction } from 'express';
import { feedbackService } from './feedback.service';
import { HTTP_STATUS } from '../../config/constants';

export class FeedbackController {
  /**
   * GET /api/v1/public/feedback/:token
   */
  async getByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token);
      const data = await feedbackService.getFeedbackByToken(token);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/public/feedback/:token
   */
  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token);
      const { rating, comment } = req.body;
      const result = await feedbackService.submitFeedback(token, { rating, comment });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/feedback/generate-token
   */
  async generateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { clientId, appointmentId, clientName, service, technician } = req.body;
      const result = await feedbackService.generateFeedbackToken({
        clientId,
        appointmentId,
        clientName,
        service,
        technician,
      });
      res.status(HTTP_STATUS.CREATED).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/client-feedback (Manager & Reception)
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, page } = req.query;
      const result = await feedbackService.getAllFeedback({
        limit: limit ? Number(limit) : undefined,
        page: page ? Number(page) : undefined,
      });
      res.status(HTTP_STATUS.OK).json({ success: true, data: result.feedback, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }
}

export const feedbackController = new FeedbackController();
