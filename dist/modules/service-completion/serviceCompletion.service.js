"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceCompletionService = exports.ServiceCompletionService = void 0;
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const stock_service_1 = require("../stock/stock.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const logger_1 = require("../../utils/logger");
class ServiceCompletionService {
    async completeService(appointmentServiceId, input, authUser) {
        // 1. Fetch AppointmentService with appointment, service, and technician
        const appointmentService = await database_1.default.appointmentService.findUnique({
            where: { id: appointmentServiceId },
            include: {
                appointment: {
                    include: {
                        client: true,
                    },
                },
                service: true,
                technician: {
                    include: {
                        staffProfile: true,
                    },
                },
            },
        });
        if (!appointmentService) {
            throw new errorHandler_1.AppError('Appointment service not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const { appointment, service, technician } = appointmentService;
        if (!service) {
            throw new errorHandler_1.AppError('Service definition not found for this appointment service', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // 2. Requirement: Service can be closed when Appointment is active (IN_PROGRESS, SCHEDULED, or LATE)
        if (appointment.status !== client_1.AppointmentStatus.IN_PROGRESS &&
            appointment.status !== client_1.AppointmentStatus.SCHEDULED &&
            appointment.status !== client_1.AppointmentStatus.LATE) {
            throw new errorHandler_1.AppError(`Service can only be closed for active appointments (current status: ${appointment.status})`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Idempotency: Prevent completing a service that is already completed
        if (appointmentService.status === client_1.AppointmentServiceStatus.COMPLETED) {
            throw new errorHandler_1.AppError('This service has already been completed and cannot be processed again', constants_1.HTTP_STATUS.CONFLICT);
        }
        // 3. Requirement: Technician can close ONLY their assigned AppointmentService
        if (authUser.role === 'TECHNICIAN' && appointmentService.technicianId !== authUser.id) {
            throw new errorHandler_1.AppError('Access forbidden: you can only close your assigned appointment services', constants_1.HTTP_STATUS.FORBIDDEN);
        }
        const now = new Date();
        const createdMediaList = [];
        // 4. In a transaction: Consume stock, Update AppointmentService, save media, log history, and check auto-completion
        const result = await database_1.default.$transaction(async (tx) => {
            // Concurrency guard: Re-fetch within transaction to prevent race conditions
            const currentService = await tx.appointmentService.findUnique({
                where: { id: appointmentServiceId },
            });
            if (!currentService || currentService.status === client_1.AppointmentServiceStatus.COMPLETED) {
                throw new errorHandler_1.AppError('This service has already been completed and cannot be processed again', constants_1.HTTP_STATUS.CONFLICT);
            }
            // Consume required service stock:
            // - Decrements ServiceStock quantity
            // - Logs StockActivity with SERVICE_USAGE (referenceId = appointmentServiceId, createdById = technician.id)
            // - Blocks completion with 400 Bad Request if stock is insufficient
            const stockResult = await stock_service_1.stockService.consumeStockForService(service, appointmentServiceId, technician.id, tx);
            // Update AppointmentService status = COMPLETED and completedAt
            const updatedService = await tx.appointmentService.update({
                where: { id: appointmentServiceId },
                data: {
                    status: client_1.AppointmentServiceStatus.COMPLETED,
                    completedAt: now,
                },
            });
            // Save before/after media references in ClientMedia
            if (input.media && input.media.length > 0) {
                for (const item of input.media) {
                    const media = await tx.clientMedia.create({
                        data: {
                            clientId: appointment.clientId,
                            mediaType: item.mediaType,
                            fileUrl: item.fileUrl.trim(),
                            note: item.note ? item.note.trim() : `Captured on completion of ${service.name}`,
                        },
                    });
                    createdMediaList.push(media);
                }
            }
            // Create ClientHistory: SERVICE_COMPLETED
            const techName = technician.staffProfile?.name || technician.email;
            const notesDetails = input.notes ? `. Notes: ${input.notes.trim()}` : '';
            const stockDetails = stockResult ? ` (Stock consumed: ${stockResult.consumedQty})` : '';
            await tx.clientHistory.create({
                data: {
                    clientId: appointment.clientId,
                    action: 'SERVICE_COMPLETED',
                    details: `Service "${service.name}" completed by ${techName}${notesDetails}${stockDetails}`,
                    performedBy: authUser.id,
                },
            });
            // Update Appointment.notes so observations are permanently attached to appointment record
            if (input.notes && input.notes.trim()) {
                const cleanNote = input.notes.trim();
                const existingNotes = appointment.notes ? `${appointment.notes}\n` : '';
                await tx.appointment.update({
                    where: { id: appointment.id },
                    data: {
                        notes: existingNotes ? `${existingNotes}${cleanNote}` : cleanNote,
                    },
                });
            }
            // 5. Automatic Appointment Completion:
            // When all AppointmentServices are completed, automatically update Appointment status = COMPLETED
            const allAppointmentServices = await tx.appointmentService.findMany({
                where: { appointmentId: appointment.id },
            });
            const allCompleted = allAppointmentServices.every((s) => s.id === appointmentServiceId || s.status === client_1.AppointmentServiceStatus.COMPLETED);
            let currentAppointmentStatus = appointment.status;
            let appointmentCompleted = false;
            if (allCompleted) {
                await tx.appointment.update({
                    where: { id: appointment.id },
                    data: { status: client_1.AppointmentStatus.COMPLETED },
                });
                currentAppointmentStatus = client_1.AppointmentStatus.COMPLETED;
                appointmentCompleted = true;
                if (appointment.clientId) {
                    await tx.client.update({
                        where: { id: appointment.clientId },
                        data: { lastVisitAt: new Date() },
                    });
                }
                await tx.clientHistory.create({
                    data: {
                        clientId: appointment.clientId,
                        action: 'STATUS_CHANGED',
                        details: 'Appointment automatically marked COMPLETED as all services are finished',
                        performedBy: authUser.id,
                    },
                });
            }
            else if (appointment.status !== client_1.AppointmentStatus.IN_PROGRESS) {
                await tx.appointment.update({
                    where: { id: appointment.id },
                    data: { status: client_1.AppointmentStatus.IN_PROGRESS },
                });
                currentAppointmentStatus = client_1.AppointmentStatus.IN_PROGRESS;
            }
            return {
                updatedService,
                appointmentStatus: currentAppointmentStatus,
                appointmentCompleted,
                stockResult,
            };
        });
        // Fire WhatsApp after-service thank you (non-blocking)
        if (result.appointmentCompleted) {
            whatsapp_service_1.whatsappService.triggerAfterService(appointment.id).catch((err) => {
                logger_1.logger.warn('[ServiceCompletion] WhatsApp after-service trigger failed (non-blocking)', {
                    appointmentId: appointment.id,
                    error: err?.message || String(err),
                });
            });
        }
        return {
            id: appointmentService.id,
            appointmentId: appointment.id,
            serviceId: service.id,
            serviceName: service.name,
            technicianId: technician.id,
            technicianName: technician.staffProfile?.name || technician.email,
            price: appointmentService.price,
            status: result.updatedService.status,
            completedAt: result.updatedService.completedAt,
            appointmentStatus: result.appointmentStatus,
            appointmentCompleted: result.appointmentCompleted,
            stockConsumed: result.stockResult ? {
                stockItemId: result.stockResult.stockItem.id,
                quantity: result.stockResult.consumedQty,
            } : null,
            notes: input.notes || null,
            media: createdMediaList,
        };
    }
    async getServiceCompletion(appointmentServiceId, authUser) {
        const appointmentService = await database_1.default.appointmentService.findUnique({
            where: { id: appointmentServiceId },
            include: {
                appointment: {
                    include: {
                        client: {
                            select: { id: true, name: true, phone: true, quartier: true },
                        },
                        mainTechnician: {
                            select: {
                                id: true,
                                email: true,
                                staffProfile: { select: { name: true } },
                            },
                        },
                    },
                },
                service: true,
                technician: {
                    include: {
                        staffProfile: true,
                    },
                },
            },
        });
        if (!appointmentService) {
            throw new errorHandler_1.AppError('Appointment service not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // RBAC: Technician can only view if assigned
        if (authUser.role === 'TECHNICIAN') {
            const isAssignedTech = appointmentService.technicianId === authUser.id;
            const isMainTech = appointmentService.appointment.mainTechnicianId === authUser.id;
            if (!isAssignedTech && !isMainTech) {
                throw new errorHandler_1.AppError('Access forbidden: you can only view your assigned services', constants_1.HTTP_STATUS.FORBIDDEN);
            }
        }
        return {
            id: appointmentService.id,
            appointmentId: appointmentService.appointment.id,
            serviceId: appointmentService.service?.id || appointmentService.serviceId || '',
            serviceName: appointmentService.service?.name || appointmentService.appointment?.serviceSummary || 'Spa Service',
            technicianId: appointmentService.technician.id,
            technicianName: appointmentService.technician.staffProfile?.name || appointmentService.technician.email,
            price: appointmentService.price,
            status: appointmentService.status,
            completedAt: appointmentService.completedAt,
            appointment: {
                id: appointmentService.appointment.id,
                appointmentDate: appointmentService.appointment.appointmentDate,
                appointmentTime: appointmentService.appointment.appointmentTime,
                status: appointmentService.appointment.status,
                client: appointmentService.appointment.client,
            },
        };
    }
}
exports.ServiceCompletionService = ServiceCompletionService;
exports.serviceCompletionService = new ServiceCompletionService();
//# sourceMappingURL=serviceCompletion.service.js.map