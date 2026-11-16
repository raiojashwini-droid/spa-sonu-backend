"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsController = exports.ClientsController = void 0;
const clients_service_1 = require("./clients.service");
const clients_validation_1 = require("./clients.validation");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { id } = req.params;
    return Array.isArray(id) ? id[0] : id;
}
class ClientsController {
    async createClient(req, res, next) {
        try {
            const validation = clients_validation_1.createClientSchema.safeParse(req.body);
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
            const client = await clients_service_1.clientsService.createClient(validation.data, req.user);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                data: client,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getClients(req, res, next) {
        try {
            const validation = clients_validation_1.clientQuerySchema.safeParse(req.query);
            const query = validation.success ? validation.data : req.query;
            const result = await clients_service_1.clientsService.getClients(query, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result.clients,
                pagination: result.pagination,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getClientById(req, res, next) {
        try {
            const id = getParamId(req);
            const client = await clients_service_1.clientsService.getClientById(id, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: client,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateClient(req, res, next) {
        try {
            const id = getParamId(req);
            const validation = clients_validation_1.updateClientSchema.safeParse(req.body);
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
            const updated = await clients_service_1.clientsService.updateClient(id, validation.data, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async setClientStatus(req, res, next) {
        try {
            const id = getParamId(req);
            const validation = clients_validation_1.updateClientStatusSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid status provided. Use ACTIVE or INACTIVE',
                });
                return;
            }
            let status = 'ACTIVE';
            if (validation.data.status) {
                status = validation.data.status.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
            }
            else if (validation.data.isActive !== undefined) {
                status = validation.data.isActive ? 'ACTIVE' : 'INACTIVE';
            }
            const result = await clients_service_1.clientsService.setClientStatus(id, status, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: `Client status updated to ${status}`,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async activateClient(req, res, next) {
        try {
            const id = getParamId(req);
            const result = await clients_service_1.clientsService.activateClient(id, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Client restored to Active successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deactivateClient(req, res, next) {
        try {
            const id = getParamId(req);
            const result = await clients_service_1.clientsService.deactivateClient(id, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Client marked as Inactive successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteClient(req, res, next) {
        try {
            const id = getParamId(req);
            const result = await clients_service_1.clientsService.deactivateClient(id, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Client deactivated successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addClientMedia(req, res, next) {
        try {
            const id = getParamId(req);
            const validation = clients_validation_1.addClientMediaSchema.safeParse(req.body);
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
            const media = await clients_service_1.clientsService.addClientMedia(id, validation.data, req.user);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                data: media,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getClientHistory(req, res, next) {
        try {
            const id = getParamId(req);
            const history = await clients_service_1.clientsService.getClientHistory(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: history,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ClientsController = ClientsController;
exports.clientsController = new ClientsController();
//# sourceMappingURL=clients.controller.js.map