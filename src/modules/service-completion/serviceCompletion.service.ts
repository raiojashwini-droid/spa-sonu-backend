import {
  AppointmentStatus,
  AppointmentServiceStatus,
  MediaType,
} from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { CompleteServiceInput, AuthContextUser } from './serviceCompletion.types';
import { stockService } from '../stock/stock.service';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { logger } from '../../utils/logger';

export class ServiceCompletionService {
  async completeService(appointmentServiceId: string, input: CompleteServiceInput, authUser: AuthContextUser) {
    // 1. Fetch AppointmentService with appointment, service, and technician
    const appointmentService = await prisma.appointmentService.findUnique({
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
      throw new AppError('Appointment service not found', HTTP_STATUS.NOT_FOUND);
    }

    const { appointment, service, technician } = appointmentService;
    if (!service) {
      throw new AppError('Service definition not found for this appointment service', HTTP_STATUS.BAD_REQUEST);
    }

    // 2. Requirement: Service can be closed when Appointment is active (IN_PROGRESS, SCHEDULED, or LATE)
    if (
      appointment.status !== AppointmentStatus.IN_PROGRESS &&
      appointment.status !== AppointmentStatus.SCHEDULED &&
      appointment.status !== AppointmentStatus.LATE
    ) {
      throw new AppError(
        `Service can only be closed for active appointments (current status: ${appointment.status})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Idempotency: Prevent completing a service that is already completed
    if (appointmentService.status === AppointmentServiceStatus.COMPLETED) {
      throw new AppError(
        'This service has already been completed and cannot be processed again',
        HTTP_STATUS.CONFLICT
      );
    }

    // 3. Requirement: Technician can close ONLY their assigned AppointmentService
    if (authUser.role === 'TECHNICIAN' && appointmentService.technicianId !== authUser.id) {
      throw new AppError(
        'Access forbidden: you can only close your assigned appointment services',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const now = new Date();
    const createdMediaList: any[] = [];

    // 4. In a transaction: Consume stock, Update AppointmentService, save media, log history, and check auto-completion
    const result = await prisma.$transaction(async (tx) => {
      // Concurrency guard: Re-fetch within transaction to prevent race conditions
      const currentService = await tx.appointmentService.findUnique({
        where: { id: appointmentServiceId },
      });
      if (!currentService || currentService.status === AppointmentServiceStatus.COMPLETED) {
        throw new AppError(
          'This service has already been completed and cannot be processed again',
          HTTP_STATUS.CONFLICT
        );
      }

      // Consume required service stock:
      // - Decrements ServiceStock quantity
      // - Logs StockActivity with SERVICE_USAGE (referenceId = appointmentServiceId, createdById = technician.id)
      // - Blocks completion with 400 Bad Request if stock is insufficient
      const stockResult = await stockService.consumeStockForService(
        service,
        appointmentServiceId,
        technician.id,
        tx
      );

      // Update AppointmentService status = COMPLETED and completedAt
      const updatedService = await tx.appointmentService.update({
        where: { id: appointmentServiceId },
        data: {
          status: AppointmentServiceStatus.COMPLETED,
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

      const allCompleted = allAppointmentServices.every(
        (s) => s.id === appointmentServiceId || s.status === AppointmentServiceStatus.COMPLETED
      );

      let currentAppointmentStatus = appointment.status;
      let appointmentCompleted = false;

      if (allCompleted) {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: AppointmentStatus.COMPLETED },
        });

        currentAppointmentStatus = AppointmentStatus.COMPLETED;
        appointmentCompleted = true;

        await tx.clientHistory.create({
          data: {
            clientId: appointment.clientId,
            action: 'STATUS_CHANGED',
            details: 'Appointment automatically marked COMPLETED as all services are finished',
            performedBy: authUser.id,
          },
        });
      } else if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: AppointmentStatus.IN_PROGRESS },
        });
        currentAppointmentStatus = AppointmentStatus.IN_PROGRESS;
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
      whatsappService.triggerAfterService(appointment.id).catch((err: any) => {
        logger.warn('[ServiceCompletion] WhatsApp after-service trigger failed (non-blocking)', {
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

  async getServiceCompletion(appointmentServiceId: string, authUser: AuthContextUser) {
    const appointmentService = await prisma.appointmentService.findUnique({
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
      throw new AppError('Appointment service not found', HTTP_STATUS.NOT_FOUND);
    }

    // RBAC: Technician can only view if assigned
    if (authUser.role === 'TECHNICIAN') {
      const isAssignedTech = appointmentService.technicianId === authUser.id;
      const isMainTech = appointmentService.appointment.mainTechnicianId === authUser.id;
      if (!isAssignedTech && !isMainTech) {
        throw new AppError('Access forbidden: you can only view your assigned services', HTTP_STATUS.FORBIDDEN);
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

export const serviceCompletionService = new ServiceCompletionService();
