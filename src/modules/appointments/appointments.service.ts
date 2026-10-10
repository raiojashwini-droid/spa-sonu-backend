import { AppointmentStatus, AppointmentServiceStatus, ServiceStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ChangeAppointmentStatusInput,
  AppointmentQueryFilter,
  AuthContextUser,
} from './appointments.types';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { logger } from '../../utils/logger';

// Helper: convert "HH:MM" to total minutes from midnight
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper: convert total minutes back to "HH:MM"
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export class AppointmentsService {
  /**
   * Check if a technician has a conflicting appointment on a given date/time.
   * Queries BOTH mainTechnicianId AND per-service AppointmentService.technicianId
   * to prevent double-booking across all assignment types.
   * Throws AppError if conflict found.
   */
  private async checkTechnicianConflict(
    technicianId: string,
    dateStr: string,
    startTime: string,
    totalDurationMinutes: number,
    excludeAppointmentId?: string
  ): Promise<void> {
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const startOfDay = new Date(`${cleanDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${cleanDate}T23:59:59.999Z`);
    const newStartMins = timeToMinutes(startTime);
    const newEndMins = newStartMins + totalDurationMinutes;

    // Find all non-cancelled appointments where this technician is EITHER
    // the main technician OR assigned to any individual service
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { notIn: [AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED] },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        OR: [
          { mainTechnicianId: technicianId },
          { appointmentServices: { some: { technicianId: technicianId } } },
        ],
      },
      include: {
        appointmentServices: {
          include: {
            service: { select: { duration: true } },
          },
        },
      },
    });

    for (const existing of existingAppointments) {
      const existingStartMins = timeToMinutes(existing.appointmentTime);
      // Calculate total duration from appointment services
      const existingTotalDuration = existing.appointmentServices.reduce(
        (sum, as) => sum + (as.service?.duration || 30),
        0
      ) || 30; // Default 30 min if no services
      const existingEndMins = existingStartMins + existingTotalDuration;

      // Overlap check: newStart < existingEnd AND newEnd > existingStart
      if (newStartMins < existingEndMins && newEndMins > existingStartMins) {
        const existingStartStr = existing.appointmentTime;
        const existingEndStr = minutesToTime(existingEndMins);
        throw new AppError(
          `Technician is not available during this time. Existing appointment: ${existingStartStr} – ${existingEndStr}. Please select another time or technician.`,
          HTTP_STATUS.CONFLICT
        );
      }
    }
  }

  async createAppointment(data: CreateAppointmentInput, authUser: AuthContextUser) {
    // 0. Validate Operating Hours: 10:00 AM to 9:00 PM (10:00 - 21:00)
    const timeMins = timeToMinutes(data.appointmentTime);
    if (timeMins < 10 * 60 || timeMins > 21 * 60) {
      throw new AppError(
        'Appointments can only be booked between 10:00 AM and 9:00 PM (10:00 – 21:00)',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 1. Validate Client exists
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) {
      throw new AppError('Client not found', HTTP_STATUS.NOT_FOUND);
    }

    // Role-based restrictions: Technicians can ONLY book for themselves and their own clients
    const userRole = (authUser.role || '').toUpperCase();
    if (userRole === 'TECHNICIAN') {
      data.mainTechnicianId = authUser.id;
      if (data.services && data.services.length > 0) {
        data.services.forEach((s) => {
          s.technicianId = authUser.id;
        });
      }

      const isIntroduced = client.introducedByEmployeeId === authUser.id;
      const priorAppointment = await prisma.appointment.findFirst({
        where: {
          clientId: client.id,
          OR: [
            { mainTechnicianId: authUser.id },
            { appointmentServices: { some: { technicianId: authUser.id } } },
          ],
        },
      });

      if (!isIntroduced && !priorAppointment) {
        throw new AppError(
          'You can only book appointments for your own clients (clients introduced by you or with whom you have previous appointments).',
          HTTP_STATUS.FORBIDDEN
        );
      }
    }

    // 2. Validate Main Technician exists
    const technician = await prisma.user.findUnique({
      where: { id: data.mainTechnicianId },
      include: { role: true },
    });
    if (!technician || !technician.isActive) {
      throw new AppError('Technician not found or inactive', HTTP_STATUS.NOT_FOUND);
    }

    // 3. Validate Services exist and are ACTIVE
    const serviceIds = [...new Set(data.services.map((s) => s.serviceId))];
    const servicesInDb = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    if (servicesInDb.length !== serviceIds.length) {
      throw new AppError('One or more selected services do not exist', HTTP_STATUS.BAD_REQUEST);
    }

    const inactiveServices = servicesInDb.filter((s) => s.status !== ServiceStatus.ACTIVE);
    if (inactiveServices.length > 0) {
      throw new AppError(
        `Service "${inactiveServices[0].name}" is inactive and cannot be booked`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Map service prices
    const serviceMap = new Map(servicesInDb.map((s) => [s.id, s]));

    // 4. Calculate total duration and check ALL technicians for conflicts
    // Collect every unique technician ID involved (main + per-service overrides)
    const totalDuration = data.services.reduce((sum, item) => {
      const svc = serviceMap.get(item.serviceId);
      return sum + (svc?.duration || 30);
    }, 0);

    const allTechnicianIds = new Set<string>([data.mainTechnicianId]);
    for (const item of data.services) {
      if (item.technicianId) {
        allTechnicianIds.add(item.technicianId);
      }
    }

    // Check conflict for EVERY involved technician
    for (const techId of allTechnicianIds) {
      await this.checkTechnicianConflict(
        techId,
        data.appointmentDate,
        data.appointmentTime.trim(),
        totalDuration
      );
    }

    // Service summary
    const serviceNames = data.services
      .map((item) => serviceMap.get(item.serviceId)?.name)
      .filter(Boolean)
      .join(', ');

    // Parse appointmentDate
    const cleanDate = data.appointmentDate.includes('T') ? data.appointmentDate.split('T')[0] : data.appointmentDate;
    const appointmentDate = new Date(`${cleanDate}T00:00:00.000Z`);

    // 5. Create Appointment + AppointmentService records in transaction
    const appointment = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          clientId: data.clientId,
          mainTechnicianId: data.mainTechnicianId,
          appointmentDate,
          appointmentTime: data.appointmentTime.trim(),
          serviceSummary: serviceNames,
          notes: data.notes ? data.notes.trim() : null,
          status: AppointmentStatus.SCHEDULED,
          createdById: authUser.id,
        },
      });

      // Create each AppointmentService
      for (const item of data.services) {
        const serviceObj = serviceMap.get(item.serviceId)!;
        const assignedTechId = item.technicianId || data.mainTechnicianId;
        const price = item.price !== undefined ? item.price : Number(serviceObj.price);

        await tx.appointmentService.create({
          data: {
            appointmentId: appt.id,
            serviceId: item.serviceId,
            technicianId: assignedTechId,
            price,
            status: AppointmentServiceStatus.BOOKED,
          },
        });
      }

      // Log ClientHistory
      await tx.clientHistory.create({
        data: {
          clientId: data.clientId,
          action: 'APPOINTMENT_CREATED',
          details: `Appointment scheduled on ${data.appointmentDate} at ${data.appointmentTime} (${serviceNames})`,
          performedBy: authUser.id,
        },
      });

      return appt;
    });

    // 6. Send instant WhatsApp appointment confirmation to client via Meta-approved template
    // Fire-and-forget: don't block the response if WhatsApp dispatch fails
    whatsappService.triggerAppointmentConfirmation(appointment.id).catch((err) => {
      logger.error('[Appointments] WhatsApp appointment confirmation failed (non-blocking)', {
        appointmentId: appointment.id,
        error: err?.message || String(err),
      });
    });

    // 7. Send instant WhatsApp alert to the assigned barber/technician
    whatsappService.triggerStaffAppointmentAlert(appointment.id).catch((err) => {
      logger.error('[Appointments] WhatsApp staff appointment alert failed (non-blocking)', {
        appointmentId: appointment.id,
        error: err?.message || String(err),
      });
    });

    return this.getAppointmentById(appointment.id, authUser);
  }

  async getAppointments(query: AppointmentQueryFilter, authUser: AuthContextUser) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    // RBAC: Technician can ONLY view assigned appointments
    if (authUser.role === 'TECHNICIAN') {
      where.OR = [
        { mainTechnicianId: authUser.id },
        { appointmentServices: { some: { technicianId: authUser.id } } },
      ];
    } else if (query.technicianId) {
      where.OR = [
        { mainTechnicianId: query.technicianId },
        { appointmentServices: { some: { technicianId: query.technicianId } } },
      ];
    }

    if (query.date) {
      where.appointmentDate = new Date(query.date + 'T12:00:00');
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appointmentDate: 'desc' }, { appointmentTime: 'asc' }],
        include: {
          client: {
            select: { id: true, name: true, phone: true, quartier: true },
          },
          mainTechnician: {
            select: {
              id: true,
              email: true,
              staffProfile: { select: { name: true, phone: true } },
            },
          },
          appointmentServices: {
            include: {
              service: { select: { id: true, name: true, duration: true, price: true, category: true } },
              technician: {
                select: { id: true, email: true, staffProfile: { select: { name: true } } },
              },
            },
          },
        },
      }),
    ]);

    return {
      appointments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAppointmentById(id: string, authUser: AuthContextUser) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, phone: true, whatsapp: true, quartier: true },
        },
        mainTechnician: {
          select: {
            id: true,
            email: true,
            staffProfile: { select: { name: true, phone: true } },
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            staffProfile: { select: { name: true } },
          },
        },
        appointmentServices: {
          include: {
            service: { select: { id: true, name: true, duration: true, price: true, category: true } },
            technician: {
              select: { id: true, email: true, staffProfile: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND);
    }

    // RBAC: Technician cannot view other technicians' appointments
    if (authUser.role === 'TECHNICIAN') {
      const isMain = appointment.mainTechnicianId === authUser.id;
      const isParticipant = appointment.appointmentServices.some((s) => s.technicianId === authUser.id);
      if (!isMain && !isParticipant) {
        throw new AppError('Access forbidden: you can only view your assigned appointments', HTTP_STATUS.FORBIDDEN);
      }
    }

    return appointment;
  }

  async updateAppointment(id: string, data: UpdateAppointmentInput, authUser: AuthContextUser) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        appointmentServices: {
          include: { service: { select: { duration: true } } },
        },
      },
    });
    if (!appointment) {
      throw new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND);
    }

    const updateData: any = {};
    if (data.appointmentDate) {
      const cleanDate = data.appointmentDate.includes('T') ? data.appointmentDate.split('T')[0] : data.appointmentDate;
      updateData.appointmentDate = new Date(`${cleanDate}T00:00:00.000Z`);
    }
    if (data.appointmentTime) {
      const timeMins = timeToMinutes(data.appointmentTime);
      if (timeMins < 10 * 60 || timeMins > 21 * 60) {
        throw new AppError(
          'Appointments can only be booked between 10:00 AM and 9:00 PM (10:00 – 21:00)',
          HTTP_STATUS.BAD_REQUEST
        );
      }
      updateData.appointmentTime = data.appointmentTime.trim();
    }
    if (data.notes !== undefined) updateData.notes = data.notes ? data.notes.trim() : null;
    if (data.lateMinutes !== undefined) updateData.lateMinutes = data.lateMinutes;
    if (data.noShowReason !== undefined) updateData.noShowReason = data.noShowReason;

    // Technician assignment: Only MANAGER and RECEPTION
    if (data.mainTechnicianId && data.mainTechnicianId !== appointment.mainTechnicianId) {
      const tech = await prisma.user.findUnique({
        where: { id: data.mainTechnicianId },
      });
      if (!tech || !tech.isActive) {
        throw new AppError('Assigned technician not found or inactive', HTTP_STATUS.BAD_REQUEST);
      }
      updateData.mainTechnicianId = data.mainTechnicianId;
    }

    // Check technician conflict if date, time, or technician changed
    const hasScheduleChange = data.appointmentDate || data.appointmentTime || data.mainTechnicianId;
    if (hasScheduleChange) {
      const checkTechId = data.mainTechnicianId || appointment.mainTechnicianId;
      const checkDate = data.appointmentDate || appointment.appointmentDate.toISOString().split('T')[0];
      const checkTime = data.appointmentTime?.trim() || appointment.appointmentTime;
      const totalDuration = appointment.appointmentServices.reduce(
        (sum, as) => sum + (as.service?.duration || 30),
        0
      ) || 30;

      await this.checkTechnicianConflict(checkTechId, checkDate, checkTime, totalDuration, id);
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    await prisma.clientHistory.create({
      data: {
        clientId: appointment.clientId,
        action: 'APPOINTMENT_UPDATED',
        details: `Appointment updated by ${authUser.role} (${authUser.id})`,
        performedBy: authUser.id,
      },
    });

    return this.getAppointmentById(updated.id, authUser);
  }

  async changeAppointmentStatus(id: string, data: ChangeAppointmentStatusInput, authUser: AuthContextUser) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { appointmentServices: true },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND);
    }

    const currentStatus = appointment.status;
    const newStatus = data.status;

    // TECHNICIAN STATUS RULES
    if (authUser.role === 'TECHNICIAN') {
      const isAssigned =
        appointment.mainTechnicianId === authUser.id ||
        appointment.appointmentServices.some((s) => s.technicianId === authUser.id);

      if (!isAssigned) {
        throw new AppError('Access forbidden: you are not assigned to this appointment', HTTP_STATUS.FORBIDDEN);
      }

      if (newStatus === AppointmentStatus.LATE || newStatus === AppointmentStatus.NO_SHOW) {
        throw new AppError('Only Manager and Reception can mark appointments as Late or No-Show', HTTP_STATUS.FORBIDDEN);
      }

      if (currentStatus === AppointmentStatus.SCHEDULED && newStatus !== AppointmentStatus.IN_PROGRESS && newStatus !== AppointmentStatus.COMPLETED) {
        throw new AppError('From SCHEDULED, technician may only transition to IN_PROGRESS or COMPLETED', HTTP_STATUS.BAD_REQUEST);
      }

      if (currentStatus === AppointmentStatus.IN_PROGRESS && newStatus !== AppointmentStatus.COMPLETED) {
        throw new AppError('From IN_PROGRESS, technician may only transition to COMPLETED', HTTP_STATUS.BAD_REQUEST);
      }

      if (currentStatus === AppointmentStatus.COMPLETED) {
        throw new AppError('Appointment is already completed', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Perform status updates on Appointment and AppointmentServices
    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: newStatus,
      };

      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.lateMinutes !== undefined) updateData.lateMinutes = data.lateMinutes;
      if (data.noShowReason !== undefined) updateData.noShowReason = data.noShowReason;

      await tx.appointment.update({
        where: { id },
        data: updateData,
      });

      // Synchronize appointment services status
      if (newStatus === AppointmentStatus.IN_PROGRESS) {
        await tx.appointmentService.updateMany({
          where: {
            appointmentId: id,
            status: AppointmentServiceStatus.BOOKED,
          },
          data: { status: AppointmentServiceStatus.IN_PROGRESS },
        });
      } else if (newStatus === AppointmentStatus.COMPLETED) {
        await tx.appointmentService.updateMany({
          where: {
            appointmentId: id,
            status: { in: [AppointmentServiceStatus.BOOKED, AppointmentServiceStatus.IN_PROGRESS] },
          },
          data: {
            status: AppointmentServiceStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      // Log ClientHistory: STATUS_CHANGED
      await tx.clientHistory.create({
        data: {
          clientId: appointment.clientId,
          action: 'STATUS_CHANGED',
          details: `Appointment status changed from ${currentStatus} to ${newStatus} by ${authUser.role}`,
          performedBy: authUser.id,
        },
      });
    });

    return this.getAppointmentById(id, authUser);
  }

  async cancelAppointment(id: string, authUser: AuthContextUser) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { appointmentServices: true },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new AppError('Appointment is already cancelled', HTTP_STATUS.BAD_REQUEST);
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new AppError('Cannot cancel a completed appointment', HTTP_STATUS.BAD_REQUEST);
    }

    await prisma.$transaction(async (tx) => {
      // Update appointment status to CANCELLED
      await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          notes: appointment.notes
            ? `${appointment.notes}\n[Cancelled by ${authUser.role} at ${new Date().toISOString()}]`
            : `[Cancelled by ${authUser.role} at ${new Date().toISOString()}]`,
        },
      });

      // Cancel all child appointment services
      await tx.appointmentService.updateMany({
        where: {
          appointmentId: id,
          status: { in: [AppointmentServiceStatus.BOOKED, AppointmentServiceStatus.IN_PROGRESS] },
        },
        data: { status: AppointmentServiceStatus.CANCELLED },
      });

      // Log ClientHistory
      await tx.clientHistory.create({
        data: {
          clientId: appointment.clientId,
          action: 'APPOINTMENT_CANCELLED',
          details: `Appointment on ${appointment.appointmentDate.toISOString().split('T')[0]} at ${appointment.appointmentTime} cancelled by ${authUser.role}`,
          performedBy: authUser.id,
        },
      });
    });

    return this.getAppointmentById(id, authUser);
  }
}

export const appointmentsService = new AppointmentsService();
