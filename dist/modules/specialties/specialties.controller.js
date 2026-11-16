"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.specialtiesController = exports.SpecialtiesController = void 0;
const specialties_service_1 = require("./specialties.service");
const specialties_validation_1 = require("./specialties.validation");
const response_1 = require("../../utils/response");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { id } = req.params;
    return Array.isArray(id) ? id[0] : id;
}
class SpecialtiesController {
    async getSpecialties(req, res, next) {
        try {
            const list = await specialties_service_1.specialtiesService.getSpecialties();
            (0, response_1.sendSuccess)(res, list);
        }
        catch (error) {
            next(error);
        }
    }
    async getSpecialtyById(req, res, next) {
        try {
            const id = getParamId(req);
            const spec = await specialties_service_1.specialtiesService.getSpecialtyById(id);
            (0, response_1.sendSuccess)(res, spec);
        }
        catch (error) {
            next(error);
        }
    }
    async createSpecialty(req, res, next) {
        try {
            const validation = specialties_validation_1.createSpecialtySchema.safeParse(req.body);
            if (!validation.success) {
                (0, response_1.sendError)(res, 'Validation failed', constants_1.HTTP_STATUS.BAD_REQUEST, validation.error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })));
                return;
            }
            const spec = await specialties_service_1.specialtiesService.createSpecialty(validation.data);
            (0, response_1.sendSuccess)(res, spec, constants_1.HTTP_STATUS.CREATED);
        }
        catch (error) {
            next(error);
        }
    }
    async updateSpecialty(req, res, next) {
        try {
            const id = getParamId(req);
            const validation = specialties_validation_1.updateSpecialtySchema.safeParse(req.body);
            if (!validation.success) {
                (0, response_1.sendError)(res, 'Validation failed', constants_1.HTTP_STATUS.BAD_REQUEST, validation.error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })));
                return;
            }
            const spec = await specialties_service_1.specialtiesService.updateSpecialty(id, validation.data);
            (0, response_1.sendSuccess)(res, spec);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteSpecialty(req, res, next) {
        try {
            const id = getParamId(req);
            await specialties_service_1.specialtiesService.deleteSpecialty(id);
            (0, response_1.sendSuccess)(res, { message: 'Specialty deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SpecialtiesController = SpecialtiesController;
exports.specialtiesController = new SpecialtiesController();
//# sourceMappingURL=specialties.controller.js.map