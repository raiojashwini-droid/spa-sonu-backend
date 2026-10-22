import { z } from 'zod';

export const jobSeekerStatusEnum = z.enum([
  'NEW',
  'INTERVIEW_SCHEDULED',
  'SHORTLISTED',
  'HIRED',
  'REJECTED',
]);

export const createJobSeekerSchema = z.object({
  fullName: z.string().min(2, 'Candidate full name is required (min 2 characters)'),
  phone: z.string().min(6, 'Valid phone number is required'),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  positionApplied: z.string().min(2, 'Position applied for is required'),
  experienceYears: z.coerce.number().min(0).default(0).optional(),
  specialties: z.string().optional().nullable(),
  expectedSalary: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: jobSeekerStatusEnum.default('NEW').optional(),
  appliedDate: z.string().optional().nullable(),
  interviewDate: z.string().optional().nullable(),
});

export const updateJobSeekerSchema = createJobSeekerSchema.partial();

export const queryJobSeekersSchema = z.object({
  status: z.string().optional(),
  position: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
});

export type CreateJobSeekerInput = z.infer<typeof createJobSeekerSchema>;
export type UpdateJobSeekerInput = z.infer<typeof updateJobSeekerSchema>;
export type QueryJobSeekersInput = z.infer<typeof queryJobSeekersSchema>;
