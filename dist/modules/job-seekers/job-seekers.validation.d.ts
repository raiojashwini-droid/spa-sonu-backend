import { z } from 'zod';
export declare const jobSeekerStatusEnum: z.ZodEnum<["NEW", "INTERVIEW_SCHEDULED", "SHORTLISTED", "HIRED", "REJECTED"]>;
export declare const createJobSeekerSchema: z.ZodObject<{
    fullName: z.ZodString;
    phone: z.ZodString;
    whatsapp: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    email: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
    positionApplied: z.ZodString;
    experienceYears: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    specialties: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    expectedSalary: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["NEW", "INTERVIEW_SCHEDULED", "SHORTLISTED", "HIRED", "REJECTED"]>>>;
    appliedDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    interviewDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    fullName: string;
    positionApplied: string;
    email?: string | null | undefined;
    specialties?: string | null | undefined;
    status?: "NEW" | "INTERVIEW_SCHEDULED" | "SHORTLISTED" | "HIRED" | "REJECTED" | undefined;
    whatsapp?: string | null | undefined;
    notes?: string | null | undefined;
    experienceYears?: number | undefined;
    expectedSalary?: number | null | undefined;
    appliedDate?: string | null | undefined;
    interviewDate?: string | null | undefined;
}, {
    phone: string;
    fullName: string;
    positionApplied: string;
    email?: string | null | undefined;
    specialties?: string | null | undefined;
    status?: "NEW" | "INTERVIEW_SCHEDULED" | "SHORTLISTED" | "HIRED" | "REJECTED" | undefined;
    whatsapp?: string | null | undefined;
    notes?: string | null | undefined;
    experienceYears?: number | undefined;
    expectedSalary?: number | null | undefined;
    appliedDate?: string | null | undefined;
    interviewDate?: string | null | undefined;
}>;
export declare const updateJobSeekerSchema: z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    whatsapp: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    email: z.ZodOptional<z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>>;
    positionApplied: z.ZodOptional<z.ZodString>;
    experienceYears: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodNumber>>>;
    specialties: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    expectedSalary: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodEnum<["NEW", "INTERVIEW_SCHEDULED", "SHORTLISTED", "HIRED", "REJECTED"]>>>>;
    appliedDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    interviewDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    email?: string | null | undefined;
    phone?: string | undefined;
    specialties?: string | null | undefined;
    status?: "NEW" | "INTERVIEW_SCHEDULED" | "SHORTLISTED" | "HIRED" | "REJECTED" | undefined;
    whatsapp?: string | null | undefined;
    notes?: string | null | undefined;
    fullName?: string | undefined;
    positionApplied?: string | undefined;
    experienceYears?: number | undefined;
    expectedSalary?: number | null | undefined;
    appliedDate?: string | null | undefined;
    interviewDate?: string | null | undefined;
}, {
    email?: string | null | undefined;
    phone?: string | undefined;
    specialties?: string | null | undefined;
    status?: "NEW" | "INTERVIEW_SCHEDULED" | "SHORTLISTED" | "HIRED" | "REJECTED" | undefined;
    whatsapp?: string | null | undefined;
    notes?: string | null | undefined;
    fullName?: string | undefined;
    positionApplied?: string | undefined;
    experienceYears?: number | undefined;
    expectedSalary?: number | null | undefined;
    appliedDate?: string | null | undefined;
    interviewDate?: string | null | undefined;
}>;
export declare const queryJobSeekersSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    limit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
    search?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    position?: string | undefined;
}, {
    limit?: number | undefined;
    search?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    position?: string | undefined;
}>;
export type CreateJobSeekerInput = z.infer<typeof createJobSeekerSchema>;
export type UpdateJobSeekerInput = z.infer<typeof updateJobSeekerSchema>;
export type QueryJobSeekersInput = z.infer<typeof queryJobSeekersSchema>;
//# sourceMappingURL=job-seekers.validation.d.ts.map