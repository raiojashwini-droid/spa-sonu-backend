import { CreateServiceInput, UpdateServiceInput, ServiceQueryFilter } from './services.types';
export declare class ServicesService {
    getServices(query?: ServiceQueryFilter): Promise<{
        price: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ServiceStatus;
        category: string;
        description: string | null;
        duration: number;
    }[]>;
    getServiceById(id: string): Promise<{
        price: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ServiceStatus;
        category: string;
        description: string | null;
        duration: number;
    }>;
    createService(input: CreateServiceInput): Promise<{
        price: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ServiceStatus;
        category: string;
        description: string | null;
        duration: number;
    }>;
    updateService(id: string, input: UpdateServiceInput): Promise<{
        price: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ServiceStatus;
        category: string;
        description: string | null;
        duration: number;
    }>;
    deleteService(id: string): Promise<{
        price: number;
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.ServiceStatus;
        category: string;
        description: string | null;
        duration: number;
    }>;
}
export declare const servicesService: ServicesService;
//# sourceMappingURL=services.service.d.ts.map