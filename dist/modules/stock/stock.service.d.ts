import { Prisma } from '@prisma/client';
import { CreateStockInput, RefillStockInput, UpdateStockInput, StockQueryFilter, StockActivityQueryFilter, CreateRetailProductInput, RefillRetailInput, DeductRetailStockInput, AuthContextUser, CreateDailyAuditInput, StockDailyAuditQueryFilter, ReviewDailyAuditInput } from './stock.types';
export declare class StockService {
    getServiceStock(query: StockQueryFilter): Promise<{
        stock: {
            quantity: number;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            category: string | null;
            unit: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getStockById(id: string): Promise<{
        quantity: number;
        activities: ({
            createdBy: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.StockActivityType;
            createdById: string | null;
            quantity: Prisma.Decimal;
            serviceStockId: string;
            reason: string | null;
            referenceId: string | null;
        })[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string | null;
        unit: string;
    }>;
    createServiceStock(data: CreateStockInput, authUser: AuthContextUser): Promise<{
        quantity: number;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string | null;
        unit: string;
    }>;
    refillStock(id: string, data: RefillStockInput, authUser: AuthContextUser): Promise<{
        stock: {
            quantity: number;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            category: string | null;
            unit: string;
        };
        activity: {
            createdBy: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.StockActivityType;
            createdById: string | null;
            quantity: Prisma.Decimal;
            serviceStockId: string;
            reason: string | null;
            referenceId: string | null;
        };
    }>;
    adjustStock(id: string, data: RefillStockInput, authUser: AuthContextUser): Promise<{
        stock: {
            quantity: number;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            category: string | null;
            unit: string;
        };
        activity: {
            createdBy: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.StockActivityType;
            createdById: string | null;
            quantity: Prisma.Decimal;
            serviceStockId: string;
            reason: string | null;
            referenceId: string | null;
        };
    }>;
    updateStock(id: string, data: UpdateStockInput): Promise<{
        quantity: number;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: string | null;
        unit: string;
    }>;
    /**
     * Consumes required stock for a given service during completion.
     * Decrements ServiceStock quantity.
     * Logs transaction in StockActivity (SERVICE_USAGE).
     * Blocks service completion with 400 Bad Request if stock is insufficient.
     * Links to appointmentServiceId (referenceId) and technicianId (createdById).
     */
    consumeStockForService(service: {
        id: string;
        name: string;
        category: string;
    }, appointmentServiceId: string, technicianId: string, tx: Prisma.TransactionClient): Promise<{
        stockItem: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            category: string | null;
            quantity: Prisma.Decimal;
            unit: string;
        };
        activity: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.StockActivityType;
            createdById: string | null;
            quantity: Prisma.Decimal;
            serviceStockId: string;
            reason: string | null;
            referenceId: string | null;
        };
        consumedQty: number;
    } | null>;
    getStockActivities(query: StockActivityQueryFilter, authUser: AuthContextUser): Promise<{
        activities: {
            quantity: number;
            serviceStock: {
                id: string;
                name: string;
                category: string | null;
                unit: string;
            };
            createdBy: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            } | null;
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.StockActivityType;
            createdById: string | null;
            serviceStockId: string;
            reason: string | null;
            referenceId: string | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getRetailStock(): Promise<{
        products: {
            price: number;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            category: import(".prisma/client").$Enums.RetailCategory;
            quantity: number;
            barcode: string | null;
        }[];
    }>;
    updateRetailProduct(id: string, data: {
        barcode?: string;
        name?: string;
        price?: number;
        quantity?: number;
        isActive?: boolean;
    }): Promise<{
        price: number;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: import(".prisma/client").$Enums.RetailCategory;
        quantity: number;
        barcode: string | null;
    }>;
    createRetailProduct(data: CreateRetailProductInput): Promise<{
        price: number;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: import(".prisma/client").$Enums.RetailCategory;
        quantity: number;
        barcode: string | null;
    }>;
    refillRetailProduct(id: string, data: RefillRetailInput): Promise<{
        price: number;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: import(".prisma/client").$Enums.RetailCategory;
        quantity: number;
        barcode: string | null;
    }>;
    deductRetailStock(data: DeductRetailStockInput): Promise<{
        price: number;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        category: import(".prisma/client").$Enums.RetailCategory;
        quantity: number;
        barcode: string | null;
    }[]>;
    deleteServiceStock(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteRetailProduct(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    submitDailyAudit(input: CreateDailyAuditInput, user: AuthContextUser): Promise<{
        technicianName: string;
        serviceStock: {
            id: string;
            name: string;
            category: string | null;
            quantity: Prisma.Decimal;
            unit: string;
        } | null;
        technician: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        technicianId: string;
        publicId: string | null;
        date: Date;
        productName: string;
        serviceStockId: string | null;
        photoUrl: string;
        remarks: string | null;
        estimatedRemaining: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    getDailyAudits(query: StockDailyAuditQueryFilter, user: AuthContextUser): Promise<{
        audits: {
            technicianName: string;
            reviewedByName: string | null;
            stockQuantity: number | null;
            serviceStock: {
                id: string;
                name: string;
                category: string | null;
                quantity: Prisma.Decimal;
                unit: string;
            } | null;
            technician: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            };
            reviewedBy: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            } | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            technicianId: string;
            publicId: string | null;
            date: Date;
            productName: string;
            serviceStockId: string | null;
            photoUrl: string;
            remarks: string | null;
            estimatedRemaining: string | null;
            reviewNotes: string | null;
            reviewedAt: Date | null;
            reviewedById: string | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    reviewDailyAudit(id: string, input: ReviewDailyAuditInput, user: AuthContextUser): Promise<{
        technicianName: string;
        reviewedByName: string | undefined;
        serviceStock: {
            id: string;
            name: string;
            quantity: Prisma.Decimal;
            unit: string;
        } | null;
        technician: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        };
        reviewedBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        technicianId: string;
        publicId: string | null;
        date: Date;
        productName: string;
        serviceStockId: string | null;
        photoUrl: string;
        remarks: string | null;
        estimatedRemaining: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    deleteDailyAudit(id: string, user: AuthContextUser): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const stockService: StockService;
//# sourceMappingURL=stock.service.d.ts.map