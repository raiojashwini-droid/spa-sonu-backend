"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceCompletionController = exports.ServiceCompletionController = void 0;
const serviceCompletion_service_1 = require("./serviceCompletion.service");
const serviceCompletion_validation_1 = require("./serviceCompletion.validation");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { appointmentServiceId } = req.params;
    return Array.isArray(appointmentServiceId) ? appointmentServiceId[0] : appointmentServiceId;
}
class ServiceCompletionController {
    async completeService(req, res, next) {
        try {
            const appointmentServiceId = getParamId(req);
            const validation = serviceCompletion_validation_1.completeServiceSchema.safeParse(req.body);
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
            const result = await serviceCompletion_service_1.serviceCompletionService.completeService(appointmentServiceId, validation.data, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Service completed successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getServiceCompletion(req, res, next) {
        try {
            const appointmentServiceId = getParamId(req);
            const result = await serviceCompletion_service_1.serviceCompletionService.getServiceCompletion(appointmentServiceId, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ServiceCompletionController = ServiceCompletionController;
exports.serviceCompletionController = new ServiceCompletionController();
//# sourceMappingURL=serviceCompletion.controller.js.map