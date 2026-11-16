"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsController = exports.PaymentsController = void 0;
const payments_service_1 = require("./payments.service");
const payments_validation_1 = require("./payments.validation");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { id } = req.params;
    return Array.isArray(id) ? id[0] : id;
}
class PaymentsController {
    async recordPayment(req, res, next) {
        try {
            const validation = payments_validation_1.recordPaymentSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            const result = await payments_service_1.paymentsService.recordPayment(validation.data, req.user);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Payment recorded successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPayments(req, res, next) {
        try {
            const validation = payments_validation_1.paymentQuerySchema.safeParse(req.query);
            const query = validation.success ? validation.data : req.query;
            const result = await payments_service_1.paymentsService.getPayments(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result.payments,
                pagination: result.pagination,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPaymentById(req, res, next) {
        try {
            const id = getParamId(req);
            const payment = await payments_service_1.paymentsService.getPaymentById(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: payment,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PaymentsController = PaymentsController;
exports.paymentsController = new PaymentsController();
//# sourceMappingURL=payments.controller.js.map