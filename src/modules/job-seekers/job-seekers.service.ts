import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { logger } from '../../utils/logger';
import {
  CreateJobSeekerInput,
  UpdateJobSeekerInput,
  QueryJobSeekersInput,
} from './job-seekers.validation';
import { JobSeekerStatus, Prisma } from '@prisma/client';

export class JobSeekersService {
  /**
   * List candidates with filtering, searching, and status aggregation
   */
  async listJobSeekers(query: QueryJobSeekersInput) {
    const { status, position, search } = query;

    const where: Prisma.JobSeekerWhereInput = {};

    if (status && status !== 'ALL') {
      const upStatus = status.toUpperCase().trim() as JobSeekerStatus;
      if (Object.values(JobSeekerStatus).includes(upStatus)) {
        where.status = upStatus;
      }
    }

    if (position && position !== 'ALL') {
      where.positionApplied = { contains: position };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { phone: { contains: q } },
        { whatsapp: { contains: q } },
        { email: { contains: q } },
        { positionApplied: { contains: q } },
        { specialties: { contains: q } },
      ];
    }

    // Parallel fetch: records + pipeline counts
    const [records, countNew, countInterview, countShortlist, countHired, countRejected, totalAll] =
      await Promise.all([
        prisma.jobSeeker.findMany({
          where,
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                staffProfile: { select: { name: true } },
              },
            },
          },
          orderBy: [{ appliedDate: 'desc' }, { createdAt: 'desc' }],
        }),
        prisma.jobSeeker.count({ where: { status: JobSeekerStatus.NEW } }),
        prisma.jobSeeker.count({ where: { status: JobSeekerStatus.INTERVIEW_SCHEDULED } }),
        prisma.jobSeeker.count({ where: { status: JobSeekerStatus.SHORTLISTED } }),
        prisma.jobSeeker.count({ where: { status: JobSeekerStatus.HIRED } }),
        prisma.jobSeeker.count({ where: { status: JobSeekerStatus.REJECTED } }),
        prisma.jobSeeker.count(),
      ]);

    const formattedRecords = records.map((r) => ({
      ...r,
      createdByName: r.createdBy?.staffProfile?.name || r.createdBy?.email || 'Reception',
    }));

    return {
      candidates: formattedRecords,
      summary: {
        total: totalAll,
        new: countNew,
        interviewScheduled: countInterview,
        shortlisted: countShortlist,
        hired: countHired,
        rejected: countRejected,
      },
    };
  }

  /**
   * Get candidate by ID
   */
  async getJobSeekerById(id: string) {
    const candidate = await prisma.jobSeeker.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            staffProfile: { select: { name: true } },
          },
        },
      },
    });

    if (!candidate) {
      throw new AppError('Job seeker profile not found', HTTP_STATUS.NOT_FOUND);
    }

    return {
      ...candidate,
      createdByName: candidate.createdBy?.staffProfile?.name || candidate.createdBy?.email || 'Reception',
    };
  }

  /**
   * Create candidate record
   */
  async createJobSeeker(data: CreateJobSeekerInput, createdById?: string) {
    const appliedDate = data.appliedDate ? new Date(data.appliedDate) : new Date();
    const interviewDate = data.interviewDate ? new Date(data.interviewDate) : null;

    logger.info(`[JobSeekers] Creating candidate profile for ${data.fullName} (${data.positionApplied})`);

    const created = await prisma.jobSeeker.create({
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        whatsapp: data.whatsapp ? data.whatsapp.trim() : null,
        email: data.email ? data.email.trim() : null,
        positionApplied: data.positionApplied.trim(),
        experienceYears: data.experienceYears ?? 0,
        specialties: data.specialties ? data.specialties.trim() : null,
        expectedSalary: data.expectedSalary != null ? new Prisma.Decimal(data.expectedSalary) : null,
        notes: data.notes ? data.notes.trim() : null,
        status: (data.status as JobSeekerStatus) || JobSeekerStatus.NEW,
        appliedDate,
        interviewDate,
        createdById: createdById || null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            staffProfile: { select: { name: true } },
          },
        },
      },
    });

    return {
      ...created,
      createdByName: created.createdBy?.staffProfile?.name || created.createdBy?.email || 'Reception',
    };
  }

  /**
   * Update candidate details or status
   */
  async updateJobSeeker(id: string, data: UpdateJobSeekerInput) {
    const existing = await prisma.jobSeeker.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Job seeker profile not found', HTTP_STATUS.NOT_FOUND);
    }

    const updateData: Prisma.JobSeekerUpdateInput = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp ? data.whatsapp.trim() : null;
    if (data.email !== undefined) updateData.email = data.email ? data.email.trim() : null;
    if (data.positionApplied !== undefined) updateData.positionApplied = data.positionApplied.trim();
    if (data.experienceYears !== undefined) updateData.experienceYears = data.experienceYears;
    if (data.specialties !== undefined) updateData.specialties = data.specialties ? data.specialties.trim() : null;
    if (data.expectedSalary !== undefined) {
      updateData.expectedSalary = data.expectedSalary != null ? new Prisma.Decimal(data.expectedSalary) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes ? data.notes.trim() : null;
    if (data.status !== undefined) updateData.status = data.status as JobSeekerStatus;
    if (data.interviewDate !== undefined) {
      updateData.interviewDate = data.interviewDate ? new Date(data.interviewDate) : null;
    }
    if (data.appliedDate !== undefined) {
      updateData.appliedDate = data.appliedDate ? new Date(data.appliedDate) : undefined;
    }

    const updated = await prisma.jobSeeker.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            staffProfile: { select: { name: true } },
          },
        },
      },
    });

    logger.info(`[JobSeekers] Updated candidate profile ${id} (${updated.fullName}) to status ${updated.status}`);

    return {
      ...updated,
      createdByName: updated.createdBy?.staffProfile?.name || updated.createdBy?.email || 'Reception',
    };
  }

  /**
   * Delete candidate record
   */
  async deleteJobSeeker(id: string) {
    const existing = await prisma.jobSeeker.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Job seeker profile not found', HTTP_STATUS.NOT_FOUND);
    }

    await prisma.jobSeeker.delete({ where: { id } });
    logger.info(`[JobSeekers] Deleted candidate profile ${id} (${existing.fullName})`);
    return { success: true, message: 'Candidate record removed successfully' };
  }
}

export const jobSeekersService = new JobSeekersService();
