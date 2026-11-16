import { z } from 'zod';
export declare const createAppointmentServiceItemSchema: z.ZodObject<{
    serviceId: z.ZodString;
    technicianId: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    serviceId: string;
    technicianId?: string | undefined;
    price?: number | undefined;
}, {
    serviceId: string;
    technicianId?: string | undefined;
    price?: number | undefined;
}>;
export declare const appointmentTimeSchema: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodEffects<z.ZodString, string, string>>;
export declare const createAppointmentSchema: z.ZodObject<{
    clientId: z.ZodString;
    appointmentDate: z.ZodString;
    appointmentTime: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodEffects<z.ZodString, string, string>>;
    mainTechnicianId: z.ZodString;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    services: z.ZodArray<z.ZodObject<{
        serviceId: z.ZodString;
        technicianId: z.ZodOptional<z.ZodString>;
        price: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        serviceId: string;
        technicianId?: string | undefined;
        price?: number | undefined;
    }, {
        serviceId: string;
        technicianId?: string | undefined;
        price?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    clientId: string;
    appointmentDate: string;
    mainTechnicianId: string;
    appointmentTime: string;
    services: {
        serviceId: string;
        technicianId?: string | undefined;
        price?: number | undefined;
    }[];
    notes?: string | null | undefined;
}, {
    clientId: string;
    appointmentDate: string;
    mainTechnicianId: string;
    appointmentTime: string;
    services: {
        serviceId: string;
        technicianId?: string | undefined;
        price?: number | undefined;
    }[];
    notes?: string | null | undefined;
}>;
export declare const updateAppointmentSchema: z.ZodObject<{
    appointmentDate: z.ZodOptional<z.ZodString>;
    appointmentTime: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodEffects<z.ZodString, string, string>>>;
    mainTechnicianId: z.ZodOptional<z.ZodString>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    lateMinutes: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    noShowReason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    appointmentDate?: string | undefined;
    mainTechnicianId?: string | undefined;
    appointmentTime?: string | undefined;
    notes?: string | null | undefined;
    lateMinutes?: number | null | undefined;
    noShowReason?: string | null | undefined;
}, {
    appointmentDate?: string | undefined;
    mainTechnicianId?: string | undefined;
    appointmentTime?: string | undefined;
    notes?: string | null | undefined;
    lateMinutes?: number | null | undefined;
    noShowReason?: string | null | undefined;
}>;
export declare const changeAppointmentStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["SCHEDULED", "IN_PROGRESS", "COMPLETED", "LATE", "NO_SHOW"]>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    lateMinutes: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    noShowReason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "LATE" | "NO_SHOW";
    notes?: string | null | undefined;
    lateMinutes?: number | null | undefined;
    noShowReason?: string | null | undefined;
}, {
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "LATE" | "NO_SHOW";
    notes?: string | null | undefined;
    lateMinutes?: number | null | undefined;
    noShowReason?: string | null | undefined;
}>;
export declare const appointmentQuerySchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    technicianId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        SCHEDULED: "SCHEDULED";
        IN_PROGRESS: "IN_PROGRESS";
        COMPLETED: "COMPLETED";
        LATE: "LATE";
        NO_SHOW: "NO_SHOW";
        CANCELLED: "CANCELLED";
    }>>;
    clientId: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
}, "strip", z.ZodTypeAny, {
    limit?: string | number | undefined;
    status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "LATE" | "NO_SHOW" | "CANCELLED" | undefined;
    clientId?: string | undefined;
    technicianId?: string | undefined;
    date?: string | undefined;
    page?: string | number | undefined;
}, {
    limit?: string | number | undefined;
    status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "LATE" | "NO_SHOW" | "CANCELLED" | undefined;
    clientId?: string | undefined;
    technicianId?: string | undefined;
    date?: string | undefined;
    page?: string | number | undefined;
}>;
//# sourceMappingURL=appointments.validation.d.ts.map