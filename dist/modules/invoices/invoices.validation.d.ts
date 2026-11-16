import { z } from 'zod';
export declare const createInvoiceSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    appointmentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    clientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    clientName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    clientPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    date: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    invoiceNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    discount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["DRAFT", "PENDING_PAYMENT", "PAID"]>>>;
    paymentMethod: z.ZodOptional<z.ZodEnum<["CASH", "MTN_MOMO", "ORANGE_MONEY"]>>;
    payments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        amount: z.ZodNumber;
        paymentMethod: z.ZodEnum<["CASH", "MTN_MOMO", "ORANGE_MONEY"]>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
        notes?: string | null | undefined;
    }, {
        amount: number;
        paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
        notes?: string | null | undefined;
    }>, "many">>;
    retailProducts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        retailProductId: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        retailProductId: string;
        quantity: number;
    }, {
        retailProductId: string;
        quantity: number;
    }>, "many">>;
    services: z.ZodOptional<z.ZodArray<z.ZodObject<{
        serviceId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        service: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        price: z.ZodNumber;
        technicianId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        technician: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        price: number;
        quantity: number;
        service?: string | null | undefined;
        name?: string | null | undefined;
        serviceId?: string | null | undefined;
        technicianId?: string | null | undefined;
        technician?: string | null | undefined;
    }, {
        price: number;
        service?: string | null | undefined;
        name?: string | null | undefined;
        serviceId?: string | null | undefined;
        technicianId?: string | null | undefined;
        technician?: string | null | undefined;
        quantity?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "PENDING_PAYMENT" | "PAID";
    discount: number;
    phone?: string | null | undefined;
    clientId?: string | null | undefined;
    appointmentId?: string | null | undefined;
    date?: string | Date | null | undefined;
    clientName?: string | null | undefined;
    invoiceNumber?: string | null | undefined;
    clientPhone?: string | null | undefined;
    payments?: {
        amount: number;
        paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
        notes?: string | null | undefined;
    }[] | undefined;
    paymentMethod?: "CASH" | "MTN_MOMO" | "ORANGE_MONEY" | undefined;
    services?: {
        price: number;
        quantity: number;
        service?: string | null | undefined;
        name?: string | null | undefined;
        serviceId?: string | null | undefined;
        technicianId?: string | null | undefined;
        technician?: string | null | undefined;
    }[] | undefined;
    retailProducts?: {
        retailProductId: string;
        quantity: number;
    }[] | undefined;
}, {
    phone?: string | null | undefined;
    status?: "DRAFT" | "PENDING_PAYMENT" | "PAID" | undefined;
    clientId?: string | null | undefined;
    appointmentId?: string | null | undefined;
    date?: string | Date | null | undefined;
    clientName?: string | null | undefined;
    invoiceNumber?: string | null | undefined;
    clientPhone?: string | null | undefined;
    discount?: number | undefined;
    payments?: {
        amount: number;
        paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
        notes?: string | null | undefined;
    }[] | undefined;
    paymentMethod?: "CASH" | "MTN_MOMO" | "ORANGE_MONEY" | undefined;
    services?: {
        price: number;
        service?: string | null | undefined;
        name?: string | null | undefined;
        serviceId?: string | null | undefined;
        technicianId?: string | null | undefined;
        technician?: string | null | undefined;
        quantity?: number | undefined;
    }[] | undefined;
    retailProducts?: {
        retailProductId: string;
        quantity: number;
    }[] | undefined;
}>, {
    status: "DRAFT" | "PENDING_PAYMENT" | "PAID";
    discount: number;
    phone?: string | null | undefined;
    clientId?: string | null | undefined;
    appointmentId?: string | null | undefined;
    date?: string | Date | null | undefined;
    clientName?: string | null | undefined;
    invoiceNumber?: string | null | undefined;
    clientPhone?: string | null | undefined;
    payments?: {
        amount: number;
        paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
        notes?: string | null | undefined;
    }[] | undefined;
    paymentMethod?: "CASH" | "MTN_MOMO" | "ORANGE_MONEY" | undefined;
    services?: {
        price: number;
        quantity: number;
        service?: string | null | undefined;
        name?: string | null | undefined;
        serviceId?: string | null | undefined;
        technicianId?: string | null | undefined;
        technician?: string | null | undefined;
    }[] | undefined;
    retailProducts?: {
        retailProductId: string;
        quantity: number;
    }[] | undefined;
}, {
    phone?: string | null | undefined;
    status?: "DRAFT" | "PENDING_PAYMENT" | "PAID" | undefined;
    clientId?: string | null | undefined;
    appointmentId?: string | null | undefined;
    date?: string | Date | null | undefined;
    clientName?: string | null | undefined;
    invoiceNumber?: string | null | undefined;
    clientPhone?: string | null | undefined;
    discount?: number | undefined;
    payments?: {
        amount: number;
        paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
        notes?: string | null | undefined;
    }[] | undefined;
    paymentMethod?: "CASH" | "MTN_MOMO" | "ORANGE_MONEY" | undefined;
    services?: {
        price: number;
        service?: string | null | undefined;
        name?: string | null | undefined;
        serviceId?: string | null | undefined;
        technicianId?: string | null | undefined;
        technician?: string | null | undefined;
        quantity?: number | undefined;
    }[] | undefined;
    retailProducts?: {
        retailProductId: string;
        quantity: number;
    }[] | undefined;
}>, {
    status: "DRAFT" | "PENDING_PAYMENT" | "PAID";
    discount: number;
    phone?: string | null | undefined;
    clientId?: string | null | undefined;
    appointmentId?: string | null | undefined;
    date?: string | Date | null | undefined;
    clientName?: string | null | undefined;
    invoiceNumber?: string | null | undefined;
    clientPhone?: string | null | undefined;
    payments?: {
        amount: number;
        paymentMethod: "CASH" | "MTN_MOMO" | "ORANGE_MONEY";
        notes?: string | null | undefined;
    }[] | undefined;
    paymentMethod?: "CASH" | "MTN_MOMO" | "ORANGE_MONEY" | undefined;
    services?: {
        price: number;
        quantity: number;
        service?: string | null | undefined;
        name?: string | null | undefined;
        serviceId?: string | null | undefined;
        technicianId?: string | null | undefined;
        technician?: string | null | undefined;
    }[] | undefined;
    retailProducts?: {
        retailProductId: string;
        quantity: number;
    }[] | undefined;
}, unknown>;
export declare const addInvoiceItemSchema: z.ZodObject<{
    itemType: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<{
        SERVICE: "SERVICE";
        RETAIL_PRODUCT: "RETAIL_PRODUCT";
    }>>>;
    retailProductId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    quantity: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    itemType: "SERVICE" | "RETAIL_PRODUCT";
    quantity: number;
    name?: string | undefined;
    price?: number | undefined;
    retailProductId?: string | undefined;
}, {
    name?: string | undefined;
    price?: number | undefined;
    retailProductId?: string | undefined;
    itemType?: "SERVICE" | "RETAIL_PRODUCT" | undefined;
    quantity?: number | undefined;
}>;
export declare const updateInvoiceSchema: z.ZodObject<{
    discount: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PENDING_PAYMENT"]>>;
    pointsRedeemed: z.ZodOptional<z.ZodNumber>;
    pointsEarned: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "DRAFT" | "PENDING_PAYMENT" | undefined;
    discount?: number | undefined;
    pointsEarned?: number | undefined;
    pointsRedeemed?: number | undefined;
}, {
    status?: "DRAFT" | "PENDING_PAYMENT" | undefined;
    discount?: number | undefined;
    pointsEarned?: number | undefined;
    pointsRedeemed?: number | undefined;
}>;
export declare const invoiceQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodNativeEnum<{
        DRAFT: "DRAFT";
        PENDING_PAYMENT: "PENDING_PAYMENT";
        PAID: "PAID";
    }>>;
    date: z.ZodOptional<z.ZodString>;
    clientId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
}, "strip", z.ZodTypeAny, {
    limit?: string | number | undefined;
    search?: string | undefined;
    status?: "DRAFT" | "PENDING_PAYMENT" | "PAID" | undefined;
    clientId?: string | undefined;
    date?: string | undefined;
    page?: string | number | undefined;
}, {
    limit?: string | number | undefined;
    search?: string | undefined;
    status?: "DRAFT" | "PENDING_PAYMENT" | "PAID" | undefined;
    clientId?: string | undefined;
    date?: string | undefined;
    page?: string | number | undefined;
}>;
//# sourceMappingURL=invoices.validation.d.ts.map