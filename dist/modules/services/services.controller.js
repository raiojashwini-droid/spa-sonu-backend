"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.servicesController = exports.ServicesController = void 0;
const services_service_1 = require("./services.service");
const services_validation_1 = require("./services.validation");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { id } = req.params;
    return Array.isArray(id) ? id[0] : id;
}
class ServicesController {
    async getServices(req, res, next) {
        try {
            const query = services_validation_1.serviceQuerySchema.parse(req.query);
            const services = await services_service_1.servicesService.getServices(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: services,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getServiceById(req, res, next) {
        try {
            const id = getParamId(req);
            const service = await services_service_1.servicesService.getServiceById(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: service,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createService(req, res, next) {
        try {
            const input = services_validation_1.createServiceSchema.parse(req.body);
            const service = await services_service_1.servicesService.createService(input);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                data: service,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateService(req, res, next) {
        try {
            const id = getParamId(req);
            const input = services_validation_1.updateServiceSchema.parse(req.body);
            const service = await services_service_1.servicesService.updateService(id, input);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: service,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteService(req, res, next) {
        try {
            const id = getParamId(req);
            const result = await services_service_1.servicesService.deleteService(id);
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
exports.ServicesController = ServicesController;
exports.servicesController = new ServicesController();
//# sourceMappingURL=services.controller.js.map