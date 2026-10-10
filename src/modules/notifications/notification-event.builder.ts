import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import { NotificationEventData } from './notification.types';
import { AppointmentStatus, InvoiceStatus } from '@prisma/client';

/**
 * Channel-Independent Notification Event Builder
 * Encapsulates business data querying, eligibility validation, placeholder generation,
 * and canonical idempotency key generation. Completely decoupled from WhatsApp/SMS/Email delivery channels.
 */
export class NotificationEventBuilder {
  /**
   * Compiles template string by substituting placeholders with real values.
   */
  compileTemplate(template: string, placeholders: Record<string, string | number>): string {
    let message = template;
    for (const [key, value] of Object.entries(placeholders)) {
      const reg = new RegExp(`\\{${key}\\}`, 'g');
      message = message.replace(reg, String(value));
    }
    return message;
  }

  /**
   * 1. Birthday greeting event
   */
  async buildBirthdayEvent(clientId: string, year: number = new Date().getFullYear()): Promise<NotificationEventData> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { loyalty: true },
    });

    if (!client) throw new AppError('Client not found', HTTP_STATUS.NOT_FOUND);

    const rewardPoints = 50;
    const idempotencyKey = `birthday:${client.id}:${year}`;

    return {
      eventType: 'BIRTHDAY',
      idempotencyKey,
      clientId: client.id,
      recipient: {
        clientId: client.id,
        name: client.name,
        phone: client.phone || client.whatsapp || undefined,
      },
      placeholders: {
        clientName: client.name,
        rewardPoints,
      },
    };
  }

  /**
   * 2. Anniversary greeting event
   */
  async buildAnniversaryEvent(clientId: string, year: number = new Date().getFullYear()): Promise<NotificationEventData> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) throw new AppError('Client not found', HTTP_STATUS.NOT_FOUND);

    const idempotencyKey = `anniversary:${client.id}:${year}`;

    return {
      eventType: 'ANNIVERSARY',
      idempotencyKey,
      clientId: client.id,
      recipient: {
        clientId: client.id,
        name: client.name,
        phone: client.phone || client.whatsapp || undefined,
      },
      placeholders: {
        clientName: client.name,
      },
    };
  }

  /**
   * 3. Database-driven Scheduled Appointment Reminder Events
   * Filters by exact time windows:
   *  - 24h reminder: appointments between 23h and 25h from now
   *  - 2h reminder: appointments between 1.5h and 2.5h from now
   */
  async buildScheduledReminderEvents(): Promise<{
    reminders24h: Array<NotificationEventData & { apptDate: string; apptTime: string; service: string; technician: string }>;
    reminders2h: Array<NotificationEventData & { apptDate: string; apptTime: string; service: string; technician: string }>;
    totalScheduled: number;
  }> {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.SCHEDULED,
      },
      include: {
        client: { select: { id: true, name: true, phone: true, whatsapp: true } },
        mainTechnician: { select: { id: true, email: true, staffProfile: { select: { name: true } } } },
        appointmentServices: {
          include: { service: { select: { name: true } } },
        },
      },
    });

    const reminders24h: any[] = [];
    const reminders2h: any[] = [];
    const now = Date.now();

    // Time window boundaries in milliseconds
    const HOUR_MS = 60 * 60 * 1000;
    const window24hMin = now + 23 * HOUR_MS;    // 23 hours from now
    const window24hMax = now + 25 * HOUR_MS;    // 25 hours from now
    const window2hMin = now + 1.5 * HOUR_MS;    // 1.5 hours from now
    const window2hMax = now + 2.5 * HOUR_MS;    // 2.5 hours from now

    for (const appt of appointments) {
      const clientPhone = appt.client.phone || appt.client.whatsapp;
      if (!clientPhone) continue;

      const techName = appt.mainTechnician?.staffProfile?.name || 'Your Specialist';
      const serviceName = appt.serviceSummary || appt.appointmentServices[0]?.service?.name || 'Spa Service';
      const apptDateStr = appt.appointmentDate.toISOString().split('T')[0];

      // Parse appointment date + time into a timestamp
      const apptDateTime = this.parseAppointmentDateTime(appt.appointmentDate, appt.appointmentTime);
      if (!apptDateTime) continue;

      const apptMs = apptDateTime.getTime();

      const eventBase = {
        clientId: appt.client.id,
        appointmentId: appt.id,
        recipient: {
          clientId: appt.client.id,
          name: appt.client.name,
          phone: clientPhone,
        },
        placeholders: {
          clientName: appt.client.name,
          appointmentDate: apptDateStr,
          appointmentTime: appt.appointmentTime,
          service: serviceName,
          technician: techName,
        },
        apptDate: apptDateStr,
        apptTime: appt.appointmentTime,
        service: serviceName,
        technician: techName,
      };

      // 24h window check: appointment is between 23h and 25h from now
      if (apptMs >= window24hMin && apptMs <= window24hMax) {
        reminders24h.push({
          ...eventBase,
          eventType: 'APPOINTMENT_24H',
          idempotencyKey: `appointment-24h:${appt.id}`,
        });
      }

      // 2h window check: appointment is between 1.5h and 2.5h from now
      if (apptMs >= window2hMin && apptMs <= window2hMax) {
        reminders2h.push({
          ...eventBase,
          eventType: 'APPOINTMENT_2H',
          idempotencyKey: `appointment-2h:${appt.id}`,
        });
      }
    }

    return {
      reminders24h,
      reminders2h,
      totalScheduled: appointments.length,
    };
  }

  /**
   * Parse appointment date + time string into a Date object
   * Handles formats like "10:00", "10:00 AM", "14:30"
   */
  private parseAppointmentDateTime(apptDate: Date, timeStr: string): Date | null {
    try {
      const dateStr = apptDate.toISOString().split('T')[0]; // YYYY-MM-DD
      let hours = 0;
      let minutes = 0;

      if (!timeStr || timeStr.trim().length === 0) return null;

      const cleaned = timeStr.trim().toUpperCase();
      const timeParts = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);

      if (timeParts) {
        hours = parseInt(timeParts[1], 10);
        minutes = parseInt(timeParts[2], 10);
        const period = timeParts[3];

        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
      } else {
        // Try parsing as HH:MM directly
        const simpleParts = cleaned.split(':');
        if (simpleParts.length >= 2) {
          hours = parseInt(simpleParts[0], 10);
          minutes = parseInt(simpleParts[1], 10);
        }
      }

      if (isNaN(hours) || isNaN(minutes)) return null;

      const result = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      return isNaN(result.getTime()) ? null : result;
    } catch {
      return null;
    }
  }

  /**
   * 4. After-Service Thank You Event
   */
  async buildAfterServiceEvent(appointmentId: string): Promise<NotificationEventData> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: { include: { loyalty: true } },
        mainTechnician: { include: { staffProfile: true } },
        appointmentServices: { include: { service: true } },
        feedbacks: true,
      },
    });

    if (!appointment) throw new AppError('Appointment not found', HTTP_STATUS.NOT_FOUND);

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new AppError(
        `Cannot send after-service notification: appointment is not COMPLETED (status: ${appointment.status})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const serviceName = appointment.serviceSummary || appointment.appointmentServices[0]?.service?.name || 'Spa Treatment';
    const techName = appointment.mainTechnician?.staffProfile?.name || 'Specialist';
    const loyaltyPoints = appointment.client.loyalty?.balance || 0;
    const phone = appointment.client.phone || appointment.client.whatsapp;
    const idempotencyKey = `after-service:${appointment.id}`;

    // Generate or get feedback token for this appointment
    let feedbackToken = appointment.feedbacks?.[0]?.token;
    if (!feedbackToken) {
      feedbackToken = `fb-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      await prisma.clientFeedback.create({
        data: {
          clientId: appointment.client.id,
          appointmentId: appointment.id,
          token: feedbackToken,
          rating: 0,
        },
      });
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://omega-spa-pos.netlify.app';
    const feedbackLink = `${frontendBaseUrl}/feedback?token=${feedbackToken}`;

    return {
      eventType: 'AFTER_SERVICE',
      idempotencyKey,
      clientId: appointment.client.id,
      appointmentId: appointment.id,
      recipient: {
        clientId: appointment.client.id,
        name: appointment.client.name,
        phone: phone || undefined,
      },
      placeholders: {
        clientName: appointment.client.name,
        service: serviceName,
        technician: techName,
        loyaltyPoints,
        feedbackLink,
      },
    };
  }

  /**
   * 5. Payment Confirmation Event
   */
  async buildPaymentConfirmationEvent(invoiceId: string): Promise<NotificationEventData> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: { include: { loyalty: true } },
        payments: { orderBy: { paidAt: 'desc' }, take: 1 },
        items: true,
      },
    });

    if (!invoice) throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);

    if (!invoice.client) {
      throw new AppError('Cannot send payment confirmation for invoice without client', HTTP_STATUS.BAD_REQUEST);
    }

    if (invoice.status !== InvoiceStatus.PAID) {
      throw new AppError(
        `Payment confirmation is only sent for PAID invoices (current status: ${invoice.status})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const lastPayment = invoice.payments[0];
    const paymentMethod = lastPayment ? lastPayment.paymentMethod : 'CASH';
    const loyaltyPoints = invoice.client.loyalty?.balance || 0;
    const phone = invoice.client.phone || invoice.client.whatsapp;
    const idempotencyKey = `payment-confirmation:${invoice.id}`;

    const itemsList = invoice.items && invoice.items.length > 0
      ? invoice.items.map((it) => `• ${it.name} (${Number(it.price).toLocaleString()} FCFA)`).join('\n')
      : '• Prestations & Soins';

    return {
      eventType: 'PAYMENT_CONFIRMATION',
      idempotencyKey,
      clientId: invoice.client.id,
      invoiceId: invoice.id,
      recipient: {
        clientId: invoice.client.id,
        name: invoice.client.name,
        phone: phone || undefined,
      },
      placeholders: {
        clientName: invoice.client.name,
        amount: Number(invoice.total),
        invoiceNumber: invoice.invoiceNumber,
        paymentMethod,
        loyaltyPoints,
        itemsList,
      },
    };
  }

  /**
   * 6. Rebooking Reminder Event
   */
  async buildRebookingEvent(
    clientId: string,
    businessDate: string = new Date().toISOString().split('T')[0]
  ): Promise<NotificationEventData> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!client) throw new AppError('Client not found', HTTP_STATUS.NOT_FOUND);

    const now = new Date();
    const lastVisit = client.lastVisitAt || (client.appointments[0] ? client.appointments[0].appointmentDate : null);
    const daysInactive = lastVisit ? Math.floor((now.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)) : 30;

    const phone = client.phone || client.whatsapp;
    const idempotencyKey = `rebooking:${client.id}:${businessDate}`;

    return {
      eventType: 'REBOOKING',
      idempotencyKey,
      clientId: client.id,
      recipient: {
        clientId: client.id,
        name: client.name,
        phone: phone || undefined,
      },
      placeholders: {
        clientName: client.name,
        daysInactive,
        discount: 10,
      },
    };
  }

  /**
   * 7. Daily Close Manager / Boss Event
   */
  async buildDailyCloseEvent(
    businessDate: string,
    authUserId: string,
    recipientPhoneOverride?: string
  ): Promise<NotificationEventData> {
    const startOfDay = new Date(`${businessDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${businessDate}T23:59:59.999Z`);

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    let totalRevenue = 0;
    let cashAmount = 0;
    let momoAmount = 0;
    let orangeAmount = 0;

    for (const p of payments) {
      const amt = Number(p.amount);
      totalRevenue += amt;
      if (p.paymentMethod === 'CASH') cashAmount += amt;
      if (p.paymentMethod === 'MTN_MOMO') momoAmount += amt;
      if (p.paymentMethod === 'ORANGE_MONEY') orangeAmount += amt;
    }

    const clientsServed = await prisma.appointment.count({
      where: {
        appointmentDate: { gte: startOfDay, lte: endOfDay },
        status: AppointmentStatus.COMPLETED,
      },
    });

    const managerProfile = await prisma.staffProfile.findUnique({
      where: { userId: authUserId },
    });
    const recipientPhone = recipientPhoneOverride || managerProfile?.phone || '+237670000001';
    const idempotencyKey = `daily-close:${businessDate}`;

    return {
      eventType: 'DAILY_CLOSE_BOSS',
      idempotencyKey,
      recipient: {
        name: managerProfile?.name || 'Manager',
        phone: recipientPhone,
      },
      placeholders: {
        todayDate: businessDate,
        totalRevenue,
        clientsServed,
        cashAmount,
        momoAmount,
        orangeAmount,
      },
    };
  }
}

export const notificationEventBuilder = new NotificationEventBuilder();
