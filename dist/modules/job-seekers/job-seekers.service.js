"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobSeekersService = exports.JobSeekersService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const logger_1 = require("../../utils/logger");
const client_1 = require("@prisma/client");
class JobSeekersService {
    /**
     * List candidates with filtering, searching, and status aggregation
     */
    async listJobSeekers(query) {
        const { status, position, search } = query;
        const where = {};
        if (status && status !== 'ALL') {
            const upStatus = status.toUpperCase().trim();
            if (Object.values(client_1.JobSeekerStatus).includes(upStatus)) {
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
        const [records, countNew, countInterview, countShortlist, countHired, countRejected, totalAll] = await Promise.all([
            database_1.default.jobSeeker.findMany({
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
            database_1.default.jobSeeker.count({ where: { status: client_1.JobSeekerStatus.NEW } }),
            database_1.default.jobSeeker.count({ where: { status: client_1.JobSeekerStatus.INTERVIEW_SCHEDULED } }),
            database_1.default.jobSeeker.count({ where: { status: client_1.JobSeekerStatus.SHORTLISTED } }),
            database_1.default.jobSeeker.count({ where: { status: client_1.JobSeekerStatus.HIRED } }),
            database_1.default.jobSeeker.count({ where: { status: client_1.JobSeekerStatus.REJECTED } }),
            database_1.default.jobSeeker.count(),
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
    async getJobSeekerById(id) {
        const candidate = await database_1.default.jobSeeker.findUnique({
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
            throw new errorHandler_1.AppError('Job seeker profile not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return {
            ...candidate,
            createdByName: candidate.createdBy?.staffProfile?.name || candidate.createdBy?.email || 'Reception',
        };
    }
    /**
     * Create candidate record
     */
    async createJobSeeker(data, createdById) {
        const appliedDate = data.appliedDate ? new Date(data.appliedDate) : new Date();
        const interviewDate = data.interviewDate ? new Date(data.interviewDate) : null;
        logger_1.logger.info(`[JobSeekers] Creating candidate profile for ${data.fullName} (${data.positionApplied})`);
        const created = await database_1.default.jobSeeker.create({
            data: {
                fullName: data.fullName.trim(),
                phone: data.phone.trim(),
                whatsapp: data.whatsapp ? data.whatsapp.trim() : null,
                email: data.email ? data.email.trim() : null,
                positionApplied: data.positionApplied.trim(),
                experienceYears: data.experienceYears ?? 0,
                specialties: data.specialties ? data.specialties.trim() : null,
                expectedSalary: data.expectedSalary != null ? new client_1.Prisma.Decimal(data.expectedSalary) : null,
                notes: data.notes ? data.notes.trim() : null,
                status: data.status || client_1.JobSeekerStatus.NEW,
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
    async updateJobSeeker(id, data) {
        const existing = await database_1.default.jobSeeker.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Job seeker profile not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const updateData = {};
        if (data.fullName !== undefined)
            updateData.fullName = data.fullName.trim();
        if (data.phone !== undefined)
            updateData.phone = data.phone.trim();
        if (data.whatsapp !== undefined)
            updateData.whatsapp = data.whatsapp ? data.whatsapp.trim() : null;
        if (data.email !== undefined)
            updateData.email = data.email ? data.email.trim() : null;
        if (data.positionApplied !== undefined)
            updateData.positionApplied = data.positionApplied.trim();
        if (data.experienceYears !== undefined)
            updateData.experienceYears = data.experienceYears;
        if (data.specialties !== undefined)
            updateData.specialties = data.specialties ? data.specialties.trim() : null;
        if (data.expectedSalary !== undefined) {
            updateData.expectedSalary = data.expectedSalary != null ? new client_1.Prisma.Decimal(data.expectedSalary) : null;
        }
        if (data.notes !== undefined)
            updateData.notes = data.notes ? data.notes.trim() : null;
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.interviewDate !== undefined) {
            updateData.interviewDate = data.interviewDate ? new Date(data.interviewDate) : null;
        }
        if (data.appliedDate !== undefined) {
            updateData.appliedDate = data.appliedDate ? new Date(data.appliedDate) : undefined;
        }
        const updated = await database_1.default.jobSeeker.update({
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
        logger_1.logger.info(`[JobSeekers] Updated candidate profile ${id} (${updated.fullName}) to status ${updated.status}`);
        return {
            ...updated,
            createdByName: updated.createdBy?.staffProfile?.name || updated.createdBy?.email || 'Reception',
        };
    }
    /**
     * Delete candidate record
     */
    async deleteJobSeeker(id) {
        const existing = await database_1.default.jobSeeker.findUnique({ where: { id } });
        if (!existing) {
            throw new errorHandler_1.AppError('Job seeker profile not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        await database_1.default.jobSeeker.delete({ where: { id } });
        logger_1.logger.info(`[JobSeekers] Deleted candidate profile ${id} (${existing.fullName})`);
        return { success: true, message: 'Candidate record removed successfully' };
    }
}
exports.JobSeekersService = JobSeekersService;
exports.jobSeekersService = new JobSeekersService();
//# sourceMappingURL=job-seekers.service.js.map