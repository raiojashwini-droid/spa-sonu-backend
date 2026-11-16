"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentsController = exports.AppointmentsController = void 0;
const appointments_service_1 = require("./appointments.service");
const appointments_validation_1 = require("./appointments.validation");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { id } = req.params;
    return Array.isArray(id) ? id[0] : id;
}
class AppointmentsController {
    async createAppointment(req, res, next) {
        try {
            const validation = appointments_validation_1.createAppointmentSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            const appointment = await appointments_service_1.appointmentsService.createAppointment(validation.data, req.user);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                data: appointment,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAppointments(req, res, next) {
        try {
            const validation = appointments_validation_1.appointmentQuerySchema.safeParse(req.query);
            const query = validation.success ? validation.data : req.query;
            const result = await appointments_service_1.appointmentsService.getAppointments(query, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result.appointments,
                pagination: result.pagination,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAppointmentById(req, res, next) {
        try {
            const id = getParamId(req);
            const appointment = await appointments_service_1.appointmentsService.getAppointmentById(id, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: appointment,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateAppointment(req, res, next) {
        try {
            const id = getParamId(req);
            const validation = appointments_validation_1.updateAppointmentSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            const updated = await appointments_service_1.appointmentsService.updateAppointment(id, validation.data, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async changeAppointmentStatus(req, res, next) {
        try {
            const id = getParamId(req);
            const validation = appointments_validation_1.changeAppointmentStatusSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            const updated = await appointments_service_1.appointmentsService.changeAppointmentStatus(id, validation.data, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelAppointment(req, res, next) {
        try {
            const id = getParamId(req);
            const cancelled = await appointments_service_1.appointmentsService.cancelAppointment(id, req.user);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: cancelled,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AppointmentsController = AppointmentsController;
exports.appointmentsController = new AppointmentsController();
//# sourceMappingURL=appointments.controller.js.map