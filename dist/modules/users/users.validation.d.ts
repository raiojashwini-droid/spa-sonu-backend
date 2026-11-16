import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    username: z.ZodOptional<z.ZodString>;
    role: z.ZodString;
    password: z.ZodString;
    specialties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    role: string;
    email: string;
    name: string;
    password: string;
    phone?: string | null | undefined;
    specialties?: string[] | undefined;
    username?: string | undefined;
}, {
    role: string;
    email: string;
    name: string;
    password: string;
    phone?: string | null | undefined;
    specialties?: string[] | undefined;
    username?: string | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    username: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    specialties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    active: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    role?: string | undefined;
    email?: string | undefined;
    phone?: string | null | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    specialties?: string[] | undefined;
    password?: string | undefined;
    active?: boolean | undefined;
    username?: string | undefined;
}, {
    role?: string | undefined;
    email?: string | undefined;
    phone?: string | null | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
    specialties?: string[] | undefined;
    password?: string | undefined;
    active?: boolean | undefined;
    username?: string | undefined;
}>;
//# sourceMappingURL=users.validation.d.ts.map