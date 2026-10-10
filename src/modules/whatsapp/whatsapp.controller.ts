import { Request, Response, NextFunction } from 'express';
import { whatsappService, normalizeAutomationType } from './whatsapp.service';
import {
  updateAutomationSchema,
  sendCustomMessageSchema,
  dailyCloseTriggerSchema,
  logsQuerySchema,
} from './whatsapp.validation';
import { HTTP_STATUS } from '../../config/constants';
import { AuthContextUser } from './whatsapp.types';
import { AppError } from '../../middleware/errorHandler';
import { whatsappAdapter } from './whatsapp.adapter';

function getParamId(req: Request, key: string = 'id'): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

export class WhatsAppController {
  /**
   * GET /api/v1/whatsapp/webhook — Meta webhook verification handshake
   * Meta sends: hub.mode, hub.verify_token, hub.challenge
   * We validate the token and echo back the challenge string.
   */
  async verifyWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const expectedToken = whatsappAdapter.getWebhookVerifyToken();

    if (mode === 'subscribe' && token && token === expectedToken) {
      res.status(200).send(challenge || 'OK');
    } else {
      res.status(403).json({ error: 'Webhook verification failed' });
    }
  }

  async getAutomations(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await whatsappService.getAutomations();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAutomationByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawType = getParamId(req, 'type');
      const type = normalizeAutomationType(rawType);
      const data = await whatsappService.getAutomationByType(type);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAutomation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawType = getParamId(req, 'type');
      const type = normalizeAutomationType(rawType);
      const validated = updateAutomationSchema.parse(req.body);
      const data = await whatsappService.updateAutomation(type, validated);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `${type} automation updated successfully`,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async processReminders(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await whatsappService.processScheduledReminders();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Scheduled appointment reminders processed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async triggerDailyClose(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = dailyCloseTriggerSchema.parse(req.body);
      const authUser = (req as any).user as AuthContextUser;
      const result = await whatsappService.triggerDailyCloseBoss(validated, authUser);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.alreadySent
          ? 'Daily close summary was already sent for this date'
          : 'Daily close summary dispatched to Manager/Boss',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async triggerAfterService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { appointmentId } = req.body;
      if (!appointmentId) throw new AppError('appointmentId is required', HTTP_STATUS.BAD_REQUEST);
      const result = await whatsappService.triggerAfterService(appointmentId);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.alreadySent ? 'Already sent (idempotent)' : 'After-service thank you triggered',
        data: result.log,
      });
    } catch (error) {
      next(error);
    }
  }

  async triggerPaymentConfirmation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) throw new AppError('invoiceId is required', HTTP_STATUS.BAD_REQUEST);
      const result = await whatsappService.triggerPaymentConfirmation(invoiceId);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.alreadySent ? 'Already sent (idempotent)' : 'Payment confirmation triggered',
        data: result.log,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendInvoicePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, phone } = req.body;
      if (!invoiceId) throw new AppError('invoiceId is required', HTTP_STATUS.BAD_REQUEST);
      const result = await whatsappService.sendInvoicePdf(invoiceId, phone);
      res.status(HTTP_STATUS.OK).json({
        success: result.success,
        message: result.success ? 'PDF Receipt delivered to WhatsApp' : 'Failed to deliver PDF Receipt',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceReceiptStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoiceId = getParamId(req, 'id');
      const result = await whatsappService.getInvoiceReceiptStatus(invoiceId);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async triggerCelebrations(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await whatsappService.processCelebrationReminders();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Celebration greetings processed',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async triggerRebookingReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await whatsappService.processRebookingReminders(req.body.clientId);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Rebooking reminders processed',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendCustom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = sendCustomMessageSchema.parse(req.body);
      const result = await whatsappService.sendCustomMessage(validated);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.alreadySent
          ? 'Message was already sent (idempotent)'
          : 'WhatsApp message queued/dispatched',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = logsQuerySchema.parse(req.query);
      const result = await whatsappService.getMessageLogs(query as any);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async retryMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req, 'id');
      const data = await whatsappService.retryFailedMessage(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Message retry dispatched',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await whatsappService.handleWebhook(req.body);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const whatsappController = new WhatsAppController();
