import { CreateAppointmentInput, UpdateAppointmentInput, ChangeAppointmentStatusInput, AppointmentQueryFilter, AuthContextUser } from './appointments.types';
export declare class AppointmentsService {
    /**
     * Check if a technician has a conflicting appointment on a given date/time.
     * Queries BOTH mainTechnicianId AND per-service AppointmentService.technicianId
     * to prevent double-booking across all assignment types.
     * Throws AppError if conflict found.
     */
    private checkTechnicianConflict;
    createAppointment(data: CreateAppointmentInput, authUser: AuthContextUser): Promise<{
        client: {
            id: string;
            phone: string;
            name: string;
            whatsapp: string | null;
            quartier: string | null;
            introducedByEmployeeId: string | null;
        };
        mainTechnician: {
            staffProfile: {
                phone: string | null;
                name: string;
            } | null;
            id: string;
            email: string;
        };
        createdBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        appointmentServices: ({
            service: {
                id: string;
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                duration: number;
            } | null;
            technician: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AppointmentServiceStatus;
            appointmentId: string;
            serviceId: string | null;
            technicianId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            completedAt: Date | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        clientId: string;
        appointmentDate: Date;
        mainTechnicianId: string;
        appointmentTime: string;
        serviceSummary: string | null;
        notes: string | null;
        lateMinutes: number | null;
        noShowReason: string | null;
        createdById: string | null;
    }>;
    getAppointments(query: AppointmentQueryFilter, authUser: AuthContextUser): Promise<{
        appointments: ({
            client: {
                id: string;
                phone: string;
                name: string;
                quartier: string | null;
            };
            mainTechnician: {
                staffProfile: {
                    phone: string | null;
                    name: string;
                } | null;
                id: string;
                email: string;
            };
            appointmentServices: ({
                service: {
                    id: string;
                    name: string;
                    price: import("@prisma/client/runtime/library").Decimal;
                    category: string;
                    duration: number;
                } | null;
                technician: {
                    staffProfile: {
                        name: string;
                    } | null;
                    id: string;
                    email: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.AppointmentServiceStatus;
                appointmentId: string;
                serviceId: string | null;
                technicianId: string;
                price: import("@prisma/client/runtime/library").Decimal;
                completedAt: Date | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AppointmentStatus;
            clientId: string;
            appointmentDate: Date;
            mainTechnicianId: string;
            appointmentTime: string;
            serviceSummary: string | null;
            notes: string | null;
            lateMinutes: number | null;
            noShowReason: string | null;
            createdById: string | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAppointmentById(id: string, authUser: AuthContextUser): Promise<{
        client: {
            id: string;
            phone: string;
            name: string;
            whatsapp: string | null;
            quartier: string | null;
            introducedByEmployeeId: string | null;
        };
        mainTechnician: {
            staffProfile: {
                phone: string | null;
                name: string;
            } | null;
            id: string;
            email: string;
        };
        createdBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        appointmentServices: ({
            service: {
                id: string;
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                duration: number;
            } | null;
            technician: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AppointmentServiceStatus;
            appointmentId: string;
            serviceId: string | null;
            technicianId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            completedAt: Date | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        clientId: string;
        appointmentDate: Date;
        mainTechnicianId: string;
        appointmentTime: string;
        serviceSummary: string | null;
        notes: string | null;
        lateMinutes: number | null;
        noShowReason: string | null;
        createdById: string | null;
    }>;
    updateAppointment(id: string, data: UpdateAppointmentInput, authUser: AuthContextUser): Promise<{
        client: {
            id: string;
            phone: string;
            name: string;
            whatsapp: string | null;
            quartier: string | null;
            introducedByEmployeeId: string | null;
        };
        mainTechnician: {
            staffProfile: {
                phone: string | null;
                name: string;
            } | null;
            id: string;
            email: string;
        };
        createdBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        appointmentServices: ({
            service: {
                id: string;
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                duration: number;
            } | null;
            technician: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AppointmentServiceStatus;
            appointmentId: string;
            serviceId: string | null;
            technicianId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            completedAt: Date | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        clientId: string;
        appointmentDate: Date;
        mainTechnicianId: string;
        appointmentTime: string;
        serviceSummary: string | null;
        notes: string | null;
        lateMinutes: number | null;
        noShowReason: string | null;
        createdById: string | null;
    }>;
    changeAppointmentStatus(id: string, data: ChangeAppointmentStatusInput, authUser: AuthContextUser): Promise<{
        client: {
            id: string;
            phone: string;
            name: string;
            whatsapp: string | null;
            quartier: string | null;
            introducedByEmployeeId: string | null;
        };
        mainTechnician: {
            staffProfile: {
                phone: string | null;
                name: string;
            } | null;
            id: string;
            email: string;
        };
        createdBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        appointmentServices: ({
            service: {
                id: string;
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                duration: number;
            } | null;
            technician: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AppointmentServiceStatus;
            appointmentId: string;
            serviceId: string | null;
            technicianId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            completedAt: Date | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        clientId: string;
        appointmentDate: Date;
        mainTechnicianId: string;
        appointmentTime: string;
        serviceSummary: string | null;
        notes: string | null;
        lateMinutes: number | null;
        noShowReason: string | null;
        createdById: string | null;
    }>;
    cancelAppointment(id: string, authUser: AuthContextUser): Promise<{
        client: {
            id: string;
            phone: string;
            name: string;
            whatsapp: string | null;
            quartier: string | null;
            introducedByEmployeeId: string | null;
        };
        mainTechnician: {
            staffProfile: {
                phone: string | null;
                name: string;
            } | null;
            id: string;
            email: string;
        };
        createdBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        appointmentServices: ({
            service: {
                id: string;
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
                category: string;
                duration: number;
            } | null;
            technician: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.AppointmentServiceStatus;
            appointmentId: string;
            serviceId: string | null;
            technicianId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            completedAt: Date | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        clientId: string;
        appointmentDate: Date;
        mainTechnicianId: string;
        appointmentTime: string;
        serviceSummary: string | null;
        notes: string | null;
        lateMinutes: number | null;
        noShowReason: string | null;
        createdById: string | null;
    }>;
}
export declare const appointmentsService: AppointmentsService;
//# sourceMappingURL=appointments.service.d.ts.map