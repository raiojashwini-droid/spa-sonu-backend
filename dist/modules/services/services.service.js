"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.servicesService = exports.ServicesService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class ServicesService {
    async getServices(query = {}) {
        const where = {};
        if (query.category) {
            where.category = query.category;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.search && query.search.trim() !== '') {
            where.OR = [
                { name: { contains: query.search.trim() } },
                { category: { contains: query.search.trim() } },
            ];
        }
        const services = await database_1.default.service.findMany({
            where,
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        return services.map((s) => ({
            ...s,
            price: Number(s.price),
        }));
    }
    async getServiceById(id) {
        const service = await database_1.default.service.findUnique({
            where: { id },
        });
        if (!service) {
            throw new errorHandler_1.AppError('Service not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return {
            ...service,
            price: Number(service.price),
        };
    }
    async createService(input) {
        const trimmedName = input.name.trim();
        // Check duplicate name
        const existing = await database_1.default.service.findFirst({
            where: {
                name: { equals: trimmedName },
            },
        });
        if (existing) {
            throw new errorHandler_1.AppError('A service with this name already exists', constants_1.HTTP_STATUS.CONFLICT);
        }
        const service = await database_1.default.service.create({
            data: {
                name: trimmedName,
                category: input.category.trim(),
                description: input.description?.trim() || null,
                duration: input.duration,
                price: new client_1.Prisma.Decimal(input.price),
                status: input.status || client_1.ServiceStatus.ACTIVE,
            },
        });
        return {
            ...service,
            price: Number(service.price),
        };
    }
    async updateService(id, input) {
        await this.getServiceById(id);
        const data = {};
        if (input.name !== undefined) {
            const trimmedName = input.name.trim();
            const duplicate = await database_1.default.service.findFirst({
                where: {
                    name: { equals: trimmedName },
                    id: { not: id },
                },
            });
            if (duplicate) {
                throw new errorHandler_1.AppError('A service with this name already exists', constants_1.HTTP_STATUS.CONFLICT);
            }
            data.name = trimmedName;
        }
        if (input.category !== undefined) {
            data.category = input.category.trim();
        }
        if (input.description !== undefined) {
            data.description = input.description ? input.description.trim() : null;
        }
        if (input.duration !== undefined) {
            data.duration = input.duration;
        }
        if (input.price !== undefined) {
            data.price = new client_1.Prisma.Decimal(input.price);
        }
        if (input.status !== undefined) {
            data.status = input.status;
        }
        const updated = await database_1.default.service.update({
            where: { id },
            data,
        });
        return {
            ...updated,
            price: Number(updated.price),
        };
    }
    async deleteService(id) {
        const service = await this.getServiceById(id);
        // If active and has existing appointments, soft-deactivate first to prevent accidental deletion
        if (service.status === client_1.ServiceStatus.ACTIVE) {
            const usageCount = await database_1.default.appointmentService.count({
                where: { serviceId: id },
            });
            if (usageCount > 0) {
                const deactivated = await database_1.default.service.update({
                    where: { id },
                    data: { status: client_1.ServiceStatus.INACTIVE },
                });
                return {
                    ...deactivated,
                    price: Number(deactivated.price),
                    message: 'Service deactivated.',
                };
            }
        }
        // If service is already INACTIVE (or has 0 appointments), perform permanent deletion
        await database_1.default.appointmentService.updateMany({
            where: { serviceId: id },
            data: { serviceId: null },
        });
        await database_1.default.invoiceItem.updateMany({
            where: { serviceId: id },
            data: { serviceId: null },
        });
        const deleted = await database_1.default.service.delete({
            where: { id },
        });
        return {
            ...deleted,
            price: Number(deleted.price),
            message: 'Service permanently deleted.',
        };
    }
}
exports.ServicesService = ServicesService;
exports.servicesService = new ServicesService();
//# sourceMappingURL=services.service.js.map