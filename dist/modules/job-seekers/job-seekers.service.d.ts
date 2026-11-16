import { CreateJobSeekerInput, UpdateJobSeekerInput, QueryJobSeekersInput } from './job-seekers.validation';
import { Prisma } from '@prisma/client';
export declare class JobSeekersService {
    /**
     * List candidates with filtering, searching, and status aggregation
     */
    listJobSeekers(query: QueryJobSeekersInput): Promise<{
        candidates: {
            createdByName: string;
            createdBy: {
                staffProfile: {
                    name: string;
                } | null;
                id: string;
                email: string;
            } | null;
            id: string;
            email: string | null;
            phone: string;
            createdAt: Date;
            updatedAt: Date;
            specialties: string | null;
            status: import(".prisma/client").$Enums.JobSeekerStatus;
            whatsapp: string | null;
            notes: string | null;
            createdById: string | null;
            fullName: string;
            positionApplied: string;
            experienceYears: number | null;
            expectedSalary: Prisma.Decimal | null;
            appliedDate: Date;
            interviewDate: Date | null;
        }[];
        summary: {
            total: number;
            new: number;
            interviewScheduled: number;
            shortlisted: number;
            hired: number;
            rejected: number;
        };
    }>;
    /**
     * Get candidate by ID
     */
    getJobSeekerById(id: string): Promise<{
        createdByName: string;
        createdBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        id: string;
        email: string | null;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        specialties: string | null;
        status: import(".prisma/client").$Enums.JobSeekerStatus;
        whatsapp: string | null;
        notes: string | null;
        createdById: string | null;
        fullName: string;
        positionApplied: string;
        experienceYears: number | null;
        expectedSalary: Prisma.Decimal | null;
        appliedDate: Date;
        interviewDate: Date | null;
    }>;
    /**
     * Create candidate record
     */
    createJobSeeker(data: CreateJobSeekerInput, createdById?: string): Promise<{
        createdByName: string;
        createdBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        id: string;
        email: string | null;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        specialties: string | null;
        status: import(".prisma/client").$Enums.JobSeekerStatus;
        whatsapp: string | null;
        notes: string | null;
        createdById: string | null;
        fullName: string;
        positionApplied: string;
        experienceYears: number | null;
        expectedSalary: Prisma.Decimal | null;
        appliedDate: Date;
        interviewDate: Date | null;
    }>;
    /**
     * Update candidate details or status
     */
    updateJobSeeker(id: string, data: UpdateJobSeekerInput): Promise<{
        createdByName: string;
        createdBy: {
            staffProfile: {
                name: string;
            } | null;
            id: string;
            email: string;
        } | null;
        id: string;
        email: string | null;
        phone: string;
        createdAt: Date;
        updatedAt: Date;
        specialties: string | null;
        status: import(".prisma/client").$Enums.JobSeekerStatus;
        whatsapp: string | null;
        notes: string | null;
        createdById: string | null;
        fullName: string;
        positionApplied: string;
        experienceYears: number | null;
        expectedSalary: Prisma.Decimal | null;
        appliedDate: Date;
        interviewDate: Date | null;
    }>;
    /**
     * Delete candidate record
     */
    deleteJobSeeker(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const jobSeekersService: JobSeekersService;
//# sourceMappingURL=job-seekers.service.d.ts.map