"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryJobSeekersSchema = exports.updateJobSeekerSchema = exports.createJobSeekerSchema = exports.jobSeekerStatusEnum = void 0;
const zod_1 = require("zod");
exports.jobSeekerStatusEnum = zod_1.z.enum([
    'NEW',
    'INTERVIEW_SCHEDULED',
    'SHORTLISTED',
    'HIRED',
    'REJECTED',
]);
exports.createJobSeekerSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Candidate full name is required (min 2 characters)'),
    phone: zod_1.z.string().min(6, 'Valid phone number is required'),
    whatsapp: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().email('Invalid email address').optional().nullable().or(zod_1.z.literal('')),
    positionApplied: zod_1.z.string().min(2, 'Position applied for is required'),
    experienceYears: zod_1.z.coerce.number().min(0).default(0).optional(),
    specialties: zod_1.z.string().optional().nullable(),
    expectedSalary: zod_1.z.coerce.number().min(0).optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    status: exports.jobSeekerStatusEnum.default('NEW').optional(),
    appliedDate: zod_1.z.string().optional().nullable(),
    interviewDate: zod_1.z.string().optional().nullable(),
});
exports.updateJobSeekerSchema = exports.createJobSeekerSchema.partial();
exports.queryJobSeekersSchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    position: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().min(1).default(1).optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).default(50).optional(),
});
//# sourceMappingURL=job-seekers.validation.js.map