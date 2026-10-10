import { Prisma, StockActivityType, RetailCategory } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import {
  CreateStockInput,
  RefillStockInput,
  UpdateStockInput,
  StockQueryFilter,
  StockActivityQueryFilter,
  CreateRetailProductInput,
  RefillRetailInput,
  DeductRetailStockInput,
  AuthContextUser,
} from './stock.types';

export class StockService {
  async getServiceStock(query: StockQueryFilter) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceStockWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search.trim() };
    }
    if (query.category) {
      where.category = query.category.trim();
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    const [total, items] = await Promise.all([
      prisma.serviceStock.count({ where }),
      prisma.serviceStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
    ]);

    return {
      stock: items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStockById(id: string) {
    const item = await prisma.serviceStock.findUnique({
      where: { id },
      include: {
        activities: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, email: true, staffProfile: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!item) {
      throw new AppError('Service stock item not found', HTTP_STATUS.NOT_FOUND);
    }

    return {
      ...item,
      quantity: Number(item.quantity),
    };
  }

  async createServiceStock(data: CreateStockInput, authUser: AuthContextUser) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.serviceStock.create({
        data: {
          name: data.name.trim(),
          category: data.category ? data.category.trim() : null,
          quantity: new Prisma.Decimal(data.quantity),
          unit: data.unit.trim(),
        },
      });

      if (data.quantity > 0) {
        await tx.stockActivity.create({
          data: {
            serviceStockId: created.id,
            type: StockActivityType.REFILL,
            quantity: new Prisma.Decimal(data.quantity),
            reason: 'Initial stock setup',
            createdById: authUser.id,
          },
        });
      }

      return {
        ...created,
        quantity: Number(created.quantity),
      };
    });
  }

  async refillStock(id: string, data: RefillStockInput, authUser: AuthContextUser) {
    const existing = await prisma.serviceStock.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Service stock item not found', HTTP_STATUS.NOT_FOUND);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.serviceStock.update({
        where: { id },
        data: {
          quantity: {
            increment: new Prisma.Decimal(data.quantity),
          },
        },
      });

      const activity = await tx.stockActivity.create({
        data: {
          serviceStockId: id,
          type: StockActivityType.REFILL,
          quantity: new Prisma.Decimal(data.quantity),
          reason: data.reason ? data.reason.trim() : 'Stock replenishment',
          createdById: authUser.id,
        },
        include: {
          createdBy: {
            select: { id: true, email: true, staffProfile: { select: { name: true } } },
          },
        },
      });

      return {
        stock: {
          ...updated,
          quantity: Number(updated.quantity),
        },
        activity,
      };
    });
  }

  async adjustStock(id: string, data: RefillStockInput, authUser: AuthContextUser) {
    const existing = await prisma.serviceStock.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Service stock item not found', HTTP_STATUS.NOT_FOUND);
    }

    const currentQty = Number(existing.quantity);
    if (data.quantity > currentQty) {
      throw new AppError(
        `Cannot deduct ${data.quantity} ${existing.unit}. Current stock is only ${currentQty} ${existing.unit}.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.serviceStock.update({
        where: { id },
        data: {
          quantity: {
            decrement: new Prisma.Decimal(data.quantity),
          },
        },
      });

      const activity = await tx.stockActivity.create({
        data: {
          serviceStockId: id,
          type: StockActivityType.ADJUSTMENT,
          quantity: new Prisma.Decimal(data.quantity),
          reason: data.reason ? data.reason.trim() : 'Stock adjustment',
          createdById: authUser.id,
        },
        include: {
          createdBy: {
            select: { id: true, email: true, staffProfile: { select: { name: true } } },
          },
        },
      });

      return {
        stock: {
          ...updated,
          quantity: Number(updated.quantity),
        },
        activity,
      };
    });
  }

  async updateStock(id: string, data: UpdateStockInput) {
    const existing = await prisma.serviceStock.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Service stock item not found', HTTP_STATUS.NOT_FOUND);
    }

    const updated = await prisma.serviceStock.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        category: data.category !== undefined ? (data.category ? data.category.trim() : null) : undefined,
        quantity: data.quantity !== undefined ? data.quantity : undefined,
        unit: data.unit !== undefined ? data.unit.trim() : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    return {
      ...updated,
      quantity: Number(updated.quantity),
    };
  }

  /**
   * Consumes required stock for a given service during completion.
   * Decrements ServiceStock quantity.
   * Logs transaction in StockActivity (SERVICE_USAGE).
   * Blocks service completion with 400 Bad Request if stock is insufficient.
   * Links to appointmentServiceId (referenceId) and technicianId (createdById).
   */
  async consumeStockForService(
    service: { id: string; name: string; category: string },
    appointmentServiceId: string,
    technicianId: string,
    tx: Prisma.TransactionClient
  ) {
    const sName = service.name.toLowerCase();
    const sCat = (service.category || '').toLowerCase();

    let stockSearchName = '';
    let requiredQty = 0;

    if (sName.includes('depleted')) {
      stockSearchName = 'Depleted Essential Oil';
      requiredQty = 10;
    } else if (sName.includes('massage') || sCat.includes('massage')) {
      stockSearchName = 'Massage Oil';
      requiredQty = 20;
    } else if (sName.includes('facial') || sCat.includes('facial')) {
      stockSearchName = 'Facial Cleanser';
      requiredQty = 10;
    } else if (sName.includes('nail') || sCat.includes('nail')) {
      stockSearchName = 'OPI Gel Polish';
      requiredQty = 5;
    } else {
      return null;
    }

    // Find stock item
    const stockItem = await tx.serviceStock.findFirst({
      where: {
        name: { contains: stockSearchName },
        isActive: true,
      },
    });

    // Check stock availability
    if (!stockItem || Number(stockItem.quantity) < requiredQty) {
      const available = stockItem ? Number(stockItem.quantity) : 0;
      throw new AppError(
        `Insufficient stock: ${stockSearchName} is out of stock or insufficient for service "${service.name}" (required: ${requiredQty}, available: ${available})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Decrement stock quantity
    const updatedStock = await tx.serviceStock.update({
      where: { id: stockItem.id },
      data: {
        quantity: {
          decrement: new Prisma.Decimal(requiredQty),
        },
      },
    });

    // Log StockActivity with SERVICE_USAGE (referenceId = appointmentServiceId, createdById = technicianId)
    const activity = await tx.stockActivity.create({
      data: {
        serviceStockId: stockItem.id,
        type: StockActivityType.SERVICE_USAGE,
        quantity: new Prisma.Decimal(requiredQty),
        reason: `Consumed for service: ${service.name}`,
        referenceId: appointmentServiceId,
        createdById: technicianId,
      },
    });

    return {
      stockItem: updatedStock,
      activity,
      consumedQty: requiredQty,
    };
  }

  async getStockActivities(query: StockActivityQueryFilter, authUser: AuthContextUser) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.StockActivityWhereInput = {};
    if (query.serviceStockId) where.serviceStockId = query.serviceStockId;
    if (query.type) where.type = query.type;
    if (query.date) {
      const d = new Date(query.date);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    // RBAC: Technician sees only their own usage activities
    if (authUser.role === 'TECHNICIAN') {
      where.createdById = authUser.id;
    }

    const [total, activities] = await Promise.all([
      prisma.stockActivity.count({ where }),
      prisma.stockActivity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          serviceStock: {
            select: { id: true, name: true, unit: true, category: true },
          },
          createdBy: {
            select: { id: true, email: true, staffProfile: { select: { name: true } } },
          },
        },
      }),
    ]);

    return {
      activities: activities.map((a) => ({
        ...a,
        quantity: Number(a.quantity),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRetailStock() {
    const products = await prisma.retailProduct.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return {
      products: products.map((p) => ({
        ...p,
        price: Number(p.price),
      })),
    };
  }

  async updateRetailProduct(
    id: string,
    data: { barcode?: string; name?: string; price?: number; quantity?: number; isActive?: boolean }
  ) {
    const existing = await prisma.retailProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Retail product not found', HTTP_STATUS.NOT_FOUND);
    }

    const updated = await prisma.retailProduct.update({
      where: { id },
      data: {
        ...(data.barcode !== undefined ? { barcode: data.barcode.trim() || null } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.price !== undefined ? { price: new Prisma.Decimal(data.price) } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  async createRetailProduct(data: CreateRetailProductInput) {
    const product = await prisma.retailProduct.create({
      data: {
        barcode: data.barcode || null,
        name: data.name.trim(),
        category: data.category,
        price: new Prisma.Decimal(data.price),
        quantity: data.quantity,
      },
    });

    return {
      ...product,
      price: Number(product.price),
    };
  }

  async refillRetailProduct(id: string, data: RefillRetailInput) {
    const existing = await prisma.retailProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Retail product not found', HTTP_STATUS.NOT_FOUND);
    }

    const updated = await prisma.retailProduct.update({
      where: { id },
      data: {
        quantity: {
          increment: data.quantity,
        },
      },
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  async deductRetailStock(data: DeductRetailStockInput) {
    return prisma.$transaction(async (tx) => {
      const updatedProducts = [];
      for (const item of data.items) {
        const existing = await tx.retailProduct.findUnique({ where: { id: item.productId } });
        if (!existing) continue;

        const currentQty = existing.quantity;
        const newQty = Math.max(0, currentQty - item.quantity);

        const updated = await tx.retailProduct.update({
          where: { id: item.productId },
          data: {
            quantity: newQty,
          },
        });

        updatedProducts.push({
          ...updated,
          price: Number(updated.price),
        });
      }

      return updatedProducts;
    });
  }

  async deleteServiceStock(id: string) {
    const existing = await prisma.serviceStock.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Service stock item not found', HTTP_STATUS.NOT_FOUND);
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockActivity.deleteMany({ where: { serviceStockId: id } });
      await tx.serviceStock.delete({ where: { id } });
    });

    return { success: true, message: 'Stock item deleted successfully' };
  }

  async deleteRetailProduct(id: string) {
    const existing = await prisma.retailProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Retail product not found', HTTP_STATUS.NOT_FOUND);
    }

    await prisma.$transaction(async (tx) => {
      // Disconnect linked invoice items (set retailProductId: null) so invoice history
      // and financial receipts remain intact, while allowing permanent deletion
      await tx.invoiceItem.updateMany({
        where: { retailProductId: id },
        data: { retailProductId: null },
      });

      await tx.retailProduct.delete({ where: { id } });
    });

    return { success: true, message: 'Retail product deleted successfully' };
  }
}

export const stockService = new StockService();
