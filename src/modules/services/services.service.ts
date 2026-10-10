import { Prisma, ServiceStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { CreateServiceInput, UpdateServiceInput, ServiceQueryFilter } from './services.types';

export class ServicesService {
  async getServices(query: ServiceQueryFilter = {}) {
    const where: Prisma.ServiceWhereInput = {};

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

    const services = await prisma.service.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return services.map((s) => ({
      ...s,
      price: Number(s.price),
    }));
  }

  async getServiceById(id: string) {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new AppError('Service not found', HTTP_STATUS.NOT_FOUND);
    }

    return {
      ...service,
      price: Number(service.price),
    };
  }

  async createService(input: CreateServiceInput) {
    const trimmedName = input.name.trim();

    // Check duplicate name
    const existing = await prisma.service.findFirst({
      where: {
        name: { equals: trimmedName },
      },
    });

    if (existing) {
      throw new AppError('A service with this name already exists', HTTP_STATUS.CONFLICT);
    }

    const service = await prisma.service.create({
      data: {
        name: trimmedName,
        category: input.category.trim(),
        description: input.description?.trim() || null,
        duration: input.duration,
        price: new Prisma.Decimal(input.price),
        status: input.status || ServiceStatus.ACTIVE,
      },
    });

    return {
      ...service,
      price: Number(service.price),
    };
  }

  async updateService(id: string, input: UpdateServiceInput) {
    await this.getServiceById(id);

    const data: Prisma.ServiceUpdateInput = {};

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      const duplicate = await prisma.service.findFirst({
        where: {
          name: { equals: trimmedName },
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new AppError('A service with this name already exists', HTTP_STATUS.CONFLICT);
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
      data.price = new Prisma.Decimal(input.price);
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    const updated = await prisma.service.update({
      where: { id },
      data,
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  async deleteService(id: string) {
    const service = await this.getServiceById(id);

    // If active and has existing appointments, soft-deactivate first to prevent accidental deletion
    if (service.status === ServiceStatus.ACTIVE) {
      const usageCount = await prisma.appointmentService.count({
        where: { serviceId: id },
      });

      if (usageCount > 0) {
        const deactivated = await prisma.service.update({
          where: { id },
          data: { status: ServiceStatus.INACTIVE },
        });
        return {
          ...deactivated,
          price: Number(deactivated.price),
          message: 'Service deactivated.',
        };
      }
    }

    // If service is already INACTIVE (or has 0 appointments), perform permanent deletion
    await prisma.appointmentService.updateMany({
      where: { serviceId: id },
      data: { serviceId: null },
    });
    await prisma.invoiceItem.updateMany({
      where: { serviceId: id },
      data: { serviceId: null },
    });

    const deleted = await prisma.service.delete({
      where: { id },
    });

    return {
      ...deleted,
      price: Number(deleted.price),
      message: 'Service permanently deleted.',
    };
  }
}

export const servicesService = new ServicesService();
