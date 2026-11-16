"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobSeekersController = exports.JobSeekersController = void 0;
const job_seekers_service_1 = require("./job-seekers.service");
const job_seekers_validation_1 = require("./job-seekers.validation");
const response_1 = require("../../utils/response");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { id } = req.params;
    return Array.isArray(id) ? id[0] : id;
}
class JobSeekersController {
    async getJobSeekers(req, res, next) {
        try {
            const validation = job_seekers_validation_1.queryJobSeekersSchema.safeParse(req.query);
            const query = validation.success ? validation.data : {};
            const result = await job_seekers_service_1.jobSeekersService.listJobSeekers(query);
            (0, response_1.sendSuccess)(res, result);
        }
        catch (error) {
            next(error);
        }
    }
    async getJobSeekerById(req, res, next) {
        try {
            const id = getParamId(req);
            const candidate = await job_seekers_service_1.jobSeekersService.getJobSeekerById(id);
            (0, response_1.sendSuccess)(res, candidate);
        }
        catch (error) {
            next(error);
        }
    }
    async createJobSeeker(req, res, next) {
        try {
            const validation = job_seekers_validation_1.createJobSeekerSchema.safeParse(req.body);
            if (!validation.success) {
                (0, response_1.sendError)(res, 'Validation failed', constants_1.HTTP_STATUS.BAD_REQUEST, validation.error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })));
                return;
            }
            const createdById = req.user?.id;
            const candidate = await job_seekers_service_1.jobSeekersService.createJobSeeker(validation.data, createdById);
            (0, response_1.sendSuccess)(res, candidate, constants_1.HTTP_STATUS.CREATED);
        }
        catch (error) {
            next(error);
        }
    }
    async updateJobSeeker(req, res, next) {
        try {
            const id = getParamId(req);
            const validation = job_seekers_validation_1.updateJobSeekerSchema.safeParse(req.body);
            if (!validation.success) {
                (0, response_1.sendError)(res, 'Validation failed', constants_1.HTTP_STATUS.BAD_REQUEST, validation.error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })));
                return;
            }
            const updated = await job_seekers_service_1.jobSeekersService.updateJobSeeker(id, validation.data);
            (0, response_1.sendSuccess)(res, updated);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteJobSeeker(req, res, next) {
        try {
            const id = getParamId(req);
            const result = await job_seekers_service_1.jobSeekersService.deleteJobSeeker(id);
            (0, response_1.sendSuccess)(res, result);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.JobSeekersController = JobSeekersController;
exports.jobSeekersController = new JobSeekersController();
//# sourceMappingURL=job-seekers.controller.js.map