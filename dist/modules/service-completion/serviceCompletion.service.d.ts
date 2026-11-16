import { CompleteServiceInput, AuthContextUser } from './serviceCompletion.types';
export declare class ServiceCompletionService {
    completeService(appointmentServiceId: string, input: CompleteServiceInput, authUser: AuthContextUser): Promise<{
        id: string;
        appointmentId: string;
        serviceId: string;
        serviceName: string;
        technicianId: string;
        technicianName: string;
        price: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.AppointmentServiceStatus;
        completedAt: Date | null;
        appointmentStatus: import(".prisma/client").$Enums.AppointmentStatus;
        appointmentCompleted: boolean;
        stockConsumed: {
            stockItemId: string;
            quantity: number;
        } | null;
        notes: string | null;
        media: any[];
    }>;
    getServiceCompletion(appointmentServiceId: string, authUser: AuthContextUser): Promise<{
        id: string;
        appointmentId: string;
        serviceId: string;
        serviceName: string;
        technicianId: string;
        technicianName: string;
        price: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.AppointmentServiceStatus;
        completedAt: Date | null;
        appointment: {
            id: string;
            appointmentDate: Date;
            appointmentTime: string;
            status: import(".prisma/client").$Enums.AppointmentStatus;
            client: {
                id: string;
                phone: string;
                name: string;
                quartier: string | null;
            };
        };
    }>;
}
export declare const serviceCompletionService: ServiceCompletionService;
//# sourceMappingURL=serviceCompletion.service.d.ts.map