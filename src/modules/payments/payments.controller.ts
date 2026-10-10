import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';
import { recordPaymentSchema, paymentQuerySchema } from './payments.validation';
import { HTTP_STATUS } from '../../config/constants';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class PaymentsController {
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = recordPaymentSchema.safeParse(req.body);
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

      const result = await paymentsService.recordPayment(validation.data, req.user!);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Payment recorded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = paymentQuerySchema.safeParse(req.query);
      const query = validation.success ? validation.data : req.query;

      const result = await paymentsService.getPayments(query);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParamId(req);
      const payment = await paymentsService.getPaymentById(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentsController = new PaymentsController();
