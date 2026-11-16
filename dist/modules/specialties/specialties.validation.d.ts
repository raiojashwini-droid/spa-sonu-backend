import { z } from 'zod';
export declare const createSpecialtySchema: z.ZodObject<{
    name: z.ZodString;
    isActive: z.ZodOptional<z.ZodBoolean>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive?: boolean | undefined;
    active?: boolean | undefined;
}, {
    name: string;
    isActive?: boolean | undefined;
    active?: boolean | undefined;
}>;
export declare const updateSpecialtySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    name?: string | undefined;
    active?: boolean | undefined;
}, {
    isActive?: boolean | undefined;
    name?: string | undefined;
    active?: boolean | undefined;
}>;
//# sourceMappingURL=specialties.validation.d.ts.map