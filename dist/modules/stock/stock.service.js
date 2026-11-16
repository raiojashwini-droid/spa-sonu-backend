"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockService = exports.StockService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class StockService {
    async getServiceStock(query) {
        const page = Math.max(1, parseInt(String(query.page || 1), 10));
        const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
        const skip = (page - 1) * limit;
        const where = {};
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
            database_1.default.serviceStock.count({ where }),
            database_1.default.serviceStock.findMany({
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
    async getStockById(id) {
        const item = await database_1.default.serviceStock.findUnique({
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
            throw new errorHandler_1.AppError('Service stock item not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return {
            ...item,
            quantity: Number(item.quantity),
        };
    }
    async createServiceStock(data, authUser) {
        return database_1.default.$transaction(async (tx) => {
            const created = await tx.serviceStock.create({
                data: {
                    name: data.name.trim(),
                    category: data.category ? data.category.trim() : null,
                    quantity: new client_1.Prisma.Decimal(data.quantity),
                    unit: data.unit.trim(),
                },
            });
            if (data.quantity > 0) {
                await tx.stockActivity.create({
                    data: {
                        serviceStockId: created.id,
                        type: client_1.StockActivityType.REFILL,
                        quantity: new client_1.Prisma.Decimal(data.quantity),
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
    async refillStock(id, data, authUser) {
        const existing = await database_1.default.serviceStock.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Service stock item not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return database_1.default.$transaction(async (tx) => {
            const updated = await tx.serviceStock.update({
                where: { id },
                data: {
                    quantity: {
                        increment: new client_1.Prisma.Decimal(data.quantity),
                    },
                },
            });
            const activity = await tx.stockActivity.create({
                data: {
                    serviceStockId: id,
                    type: client_1.StockActivityType.REFILL,
                    quantity: new client_1.Prisma.Decimal(data.quantity),
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
    async adjustStock(id, data, authUser) {
        const existing = await database_1.default.serviceStock.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Service stock item not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const currentQty = Number(existing.quantity);
        if (data.quantity > currentQty) {
            throw new errorHandler_1.AppError(`Cannot deduct ${data.quantity} ${existing.unit}. Current stock is only ${currentQty} ${existing.unit}.`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        return database_1.default.$transaction(async (tx) => {
            const updated = await tx.serviceStock.update({
                where: { id },
                data: {
                    quantity: {
                        decrement: new client_1.Prisma.Decimal(data.quantity),
                    },
                },
            });
            const activity = await tx.stockActivity.create({
                data: {
                    serviceStockId: id,
                    type: client_1.StockActivityType.ADJUSTMENT,
                    quantity: new client_1.Prisma.Decimal(data.quantity),
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
    async updateStock(id, data) {
        const existing = await database_1.default.serviceStock.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Service stock item not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const updated = await database_1.default.serviceStock.update({
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
    async consumeStockForService(service, appointmentServiceId, technicianId, tx) {
        const sName = service.name.toLowerCase();
        const sCat = (service.category || '').toLowerCase();
        let stockSearchName = '';
        let requiredQty = 0;
        if (sName.includes('depleted')) {
            stockSearchName = 'Depleted Essential Oil';
            requiredQty = 10;
        }
        else if (sName.includes('massage') || sCat.includes('massage')) {
            stockSearchName = 'Massage Oil';
            requiredQty = 20;
        }
        else if (sName.includes('facial') || sCat.includes('facial')) {
            stockSearchName = 'Facial Cleanser';
            requiredQty = 10;
        }
        else if (sName.includes('nail') || sCat.includes('nail')) {
            stockSearchName = 'OPI Gel Polish';
            requiredQty = 5;
        }
        else {
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
            throw new errorHandler_1.AppError(`Insufficient stock: ${stockSearchName} is out of stock or insufficient for service "${service.name}" (required: ${requiredQty}, available: ${available})`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Decrement stock quantity
        const updatedStock = await tx.serviceStock.update({
            where: { id: stockItem.id },
            data: {
                quantity: {
                    decrement: new client_1.Prisma.Decimal(requiredQty),
                },
            },
        });
        // Log StockActivity with SERVICE_USAGE (referenceId = appointmentServiceId, createdById = technicianId)
        const activity = await tx.stockActivity.create({
            data: {
                serviceStockId: stockItem.id,
                type: client_1.StockActivityType.SERVICE_USAGE,
                quantity: new client_1.Prisma.Decimal(requiredQty),
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
    async getStockActivities(query, authUser) {
        const page = Math.max(1, parseInt(String(query.page || 1), 10));
        const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.serviceStockId)
            where.serviceStockId = query.serviceStockId;
        if (query.type)
            where.type = query.type;
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
            database_1.default.stockActivity.count({ where }),
            database_1.default.stockActivity.findMany({
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
        const products = await database_1.default.retailProduct.findMany({
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        });
        return {
            products: products.map((p) => ({
                ...p,
                price: Number(p.price),
            })),
        };
    }
    async updateRetailProduct(id, data) {
        const existing = await database_1.default.retailProduct.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Retail product not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const updated = await database_1.default.retailProduct.update({
            where: { id },
            data: {
                ...(data.barcode !== undefined ? { barcode: data.barcode.trim() || null } : {}),
                ...(data.name !== undefined ? { name: data.name.trim() } : {}),
                ...(data.price !== undefined ? { price: new client_1.Prisma.Decimal(data.price) } : {}),
                ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            },
        });
        return {
            ...updated,
            price: Number(updated.price),
        };
    }
    async createRetailProduct(data) {
        const product = await database_1.default.retailProduct.create({
            data: {
                barcode: data.barcode || null,
                name: data.name.trim(),
                category: data.category,
                price: new client_1.Prisma.Decimal(data.price),
                quantity: data.quantity,
            },
        });
        return {
            ...product,
            price: Number(product.price),
        };
    }
    async refillRetailProduct(id, data) {
        const existing = await database_1.default.retailProduct.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Retail product not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const updated = await database_1.default.retailProduct.update({
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
    async deductRetailStock(data) {
        return database_1.default.$transaction(async (tx) => {
            const updatedProducts = [];
            for (const item of data.items) {
                const existing = await tx.retailProduct.findUnique({ where: { id: item.productId } });
                if (!existing)
                    continue;
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
    async deleteServiceStock(id) {
        const existing = await database_1.default.serviceStock.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Service stock item not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        await database_1.default.$transaction(async (tx) => {
            await tx.stockActivity.deleteMany({ where: { serviceStockId: id } });
            await tx.serviceStock.delete({ where: { id } });
        });
        return { success: true, message: 'Stock item deleted successfully' };
    }
    async deleteRetailProduct(id) {
        const existing = await database_1.default.retailProduct.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Retail product not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        await database_1.default.$transaction(async (tx) => {
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
    // ── Daily Stock Photo Audits ─────────────────────────────────────────
    async submitDailyAudit(input, user) {
        const todayStr = input.date ||
            new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Africa/Douala',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(new Date());
        const auditDate = new Date(`${todayStr}T00:00:00.000Z`);
        // Verify serviceStockId if provided
        let linkedStockId = null;
        let finalProductName = input.productName.trim();
        if (input.serviceStockId) {
            const stockItem = await database_1.default.serviceStock.findUnique({
                where: { id: input.serviceStockId },
            });
            if (stockItem) {
                linkedStockId = stockItem.id;
                finalProductName = stockItem.name;
            }
        }
        const audit = await database_1.default.serviceStockDailyAudit.create({
            data: {
                serviceStockId: linkedStockId,
                productName: finalProductName,
                photoUrl: input.photoUrl,
                publicId: input.publicId || null,
                remarks: input.remarks ? input.remarks.trim() : null,
                estimatedRemaining: input.estimatedRemaining ? input.estimatedRemaining.trim() : null,
                technicianId: user.id,
                date: auditDate,
                status: 'PENDING',
            },
            include: {
                technician: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: {
                            select: { name: true },
                        },
                    },
                },
                serviceStock: {
                    select: {
                        id: true,
                        name: true,
                        unit: true,
                        quantity: true,
                        category: true,
                    },
                },
            },
        });
        return {
            ...audit,
            technicianName: audit.technician.staffProfile?.name || audit.technician.email,
        };
    }
    async getDailyAudits(query, user) {
        const page = Math.max(1, parseInt(String(query.page || 1), 10));
        const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 50), 10)));
        const skip = (page - 1) * limit;
        const where = {};
        // Filter by date
        if (query.date) {
            where.date = new Date(`${query.date}T00:00:00.000Z`);
        }
        // Role-based visibility:
        // Technicians can see all stock photos or their own; default to showing all so they can collaborate,
        // or if technicianId filter is explicitly requested.
        if (query.technicianId) {
            where.technicianId = query.technicianId;
        }
        if (query.serviceStockId) {
            where.serviceStockId = query.serviceStockId;
        }
        if (query.status) {
            where.status = query.status.toUpperCase();
        }
        const [total, items] = await Promise.all([
            database_1.default.serviceStockDailyAudit.count({ where }),
            database_1.default.serviceStockDailyAudit.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    technician: {
                        select: {
                            id: true,
                            email: true,
                            staffProfile: {
                                select: { name: true },
                            },
                        },
                    },
                    reviewedBy: {
                        select: {
                            id: true,
                            email: true,
                            staffProfile: {
                                select: { name: true },
                            },
                        },
                    },
                    serviceStock: {
                        select: {
                            id: true,
                            name: true,
                            unit: true,
                            quantity: true,
                            category: true,
                        },
                    },
                },
            }),
        ]);
        return {
            audits: items.map((a) => ({
                ...a,
                technicianName: a.technician?.staffProfile?.name || a.technician?.email || 'Technician',
                reviewedByName: a.reviewedBy?.staffProfile?.name || a.reviewedBy?.email || null,
                stockQuantity: a.serviceStock ? Number(a.serviceStock.quantity) : null,
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async reviewDailyAudit(id, input, user) {
        const existing = await database_1.default.serviceStockDailyAudit.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Stock audit record not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const updated = await database_1.default.serviceStockDailyAudit.update({
            where: { id },
            data: {
                status: input.status,
                reviewNotes: input.reviewNotes ? input.reviewNotes.trim() : null,
                reviewedById: user.id,
                reviewedAt: new Date(),
            },
            include: {
                technician: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
                serviceStock: {
                    select: {
                        id: true,
                        name: true,
                        unit: true,
                        quantity: true,
                    },
                },
            },
        });
        return {
            ...updated,
            technicianName: updated.technician?.staffProfile?.name || updated.technician?.email,
            reviewedByName: updated.reviewedBy?.staffProfile?.name || updated.reviewedBy?.email,
        };
    }
    async deleteDailyAudit(id, user) {
        const existing = await database_1.default.serviceStockDailyAudit.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Stock audit record not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // Only manager, reception, or original technician can delete
        const roleUpper = (user.role || '').toUpperCase();
        if (roleUpper !== 'MANAGER' && roleUpper !== 'RECEPTION' && existing.technicianId !== user.id) {
            throw new errorHandler_1.AppError('Not authorized to delete this stock audit', constants_1.HTTP_STATUS.FORBIDDEN);
        }
        await database_1.default.serviceStockDailyAudit.delete({ where: { id } });
        return { success: true, message: 'Stock audit record deleted successfully' };
    }
}
exports.StockService = StockService;
exports.stockService = new StockService();
//# sourceMappingURL=stock.service.js.map