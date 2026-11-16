"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationEventBuilder = exports.NotificationEventBuilder = void 0;
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const client_1 = require("@prisma/client");
/**
 * Channel-Independent Notification Event Builder
 * Encapsulates business data querying, eligibility validation, placeholder generation,
 * and canonical idempotency key generation. Completely decoupled from WhatsApp/SMS/Email delivery channels.
 */
class NotificationEventBuilder {
    /**
     * Compiles template string by substituting placeholders with real values.
     */
    compileTemplate(template, placeholders) {
        let message = template;
        for (const [key, value] of Object.entries(placeholders)) {
            const reg = new RegExp(`\\{${key}\\}`, 'g');
            message = message.replace(reg, String(value));
        }
        if (placeholders.clientName !== undefined) {
            message = message.replace(/\{\{1\}\}/g, String(placeholders.clientName));
            message = message.replace(/\{1\}/g, String(placeholders.clientName));
        }
        return message;
    }
    /**
     * 1. Birthday greeting event
     */
    async buildBirthdayEvent(clientId, year = new Date().getFullYear()) {
        const client = await database_1.default.client.findUnique({
            where: { id: clientId },
            include: { loyalty: true },
        });
        if (!client)
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
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
    async buildAnniversaryEvent(clientId, year = new Date().getFullYear()) {
        const client = await database_1.default.client.findUnique({
            where: { id: clientId },
        });
        if (!client)
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
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
    async buildScheduledReminderEvents() {
        const appointments = await database_1.default.appointment.findMany({
            where: {
                status: client_1.AppointmentStatus.SCHEDULED,
            },
            include: {
                client: { select: { id: true, name: true, phone: true, whatsapp: true } },
                mainTechnician: { select: { id: true, email: true, staffProfile: { select: { name: true } } } },
                appointmentServices: {
                    include: { service: { select: { name: true } } },
                },
            },
        });
        const reminders24h = [];
        const reminders2h = [];
        const now = Date.now();
        // Time window boundaries in milliseconds
        const HOUR_MS = 60 * 60 * 1000;
        const window24hMin = now + 23 * HOUR_MS; // 23 hours from now
        const window24hMax = now + 25 * HOUR_MS; // 25 hours from now
        const window2hMin = now + 1.5 * HOUR_MS; // 1.5 hours from now
        const window2hMax = now + 2.5 * HOUR_MS; // 2.5 hours from now
        for (const appt of appointments) {
            const clientPhone = appt.client.phone || appt.client.whatsapp;
            if (!clientPhone)
                continue;
            const techName = appt.mainTechnician?.staffProfile?.name || 'Your Specialist';
            const serviceName = appt.serviceSummary || appt.appointmentServices[0]?.service?.name || 'Spa Service';
            const apptDateStr = appt.appointmentDate.toISOString().split('T')[0];
            // Parse appointment date + time into a timestamp
            const apptDateTime = this.parseAppointmentDateTime(appt.appointmentDate, appt.appointmentTime);
            if (!apptDateTime)
                continue;
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
    parseAppointmentDateTime(apptDate, timeStr) {
        try {
            const dateStr = apptDate.toISOString().split('T')[0]; // YYYY-MM-DD
            let hours = 0;
            let minutes = 0;
            if (!timeStr || timeStr.trim().length === 0)
                return null;
            const cleaned = timeStr.trim().toUpperCase();
            const timeParts = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
            if (timeParts) {
                hours = parseInt(timeParts[1], 10);
                minutes = parseInt(timeParts[2], 10);
                const period = timeParts[3];
                if (period === 'PM' && hours < 12)
                    hours += 12;
                if (period === 'AM' && hours === 12)
                    hours = 0;
            }
            else {
                // Try parsing as HH:MM directly
                const simpleParts = cleaned.split(':');
                if (simpleParts.length >= 2) {
                    hours = parseInt(simpleParts[0], 10);
                    minutes = parseInt(simpleParts[1], 10);
                }
            }
            if (isNaN(hours) || isNaN(minutes))
                return null;
            const result = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
            return isNaN(result.getTime()) ? null : result;
        }
        catch {
            return null;
        }
    }
    /**
     * 4. After-Service Thank You Event
     */
    async buildAfterServiceEvent(appointmentId) {
        const appointment = await database_1.default.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                client: { include: { loyalty: true } },
                mainTechnician: { include: { staffProfile: true } },
                appointmentServices: { include: { service: true } },
                feedbacks: true,
            },
        });
        if (!appointment)
            throw new errorHandler_1.AppError('Appointment not found', constants_1.HTTP_STATUS.NOT_FOUND);
        if (appointment.status !== client_1.AppointmentStatus.COMPLETED) {
            throw new errorHandler_1.AppError(`Cannot send after-service notification: appointment is not COMPLETED (status: ${appointment.status})`, constants_1.HTTP_STATUS.BAD_REQUEST);
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
            await database_1.default.clientFeedback.create({
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
    async buildPaymentConfirmationEvent(invoiceId) {
        const invoice = await database_1.default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: { include: { loyalty: true } },
                payments: { orderBy: { paidAt: 'desc' }, take: 1 },
                items: true,
            },
        });
        if (!invoice)
            throw new errorHandler_1.AppError('Invoice not found', constants_1.HTTP_STATUS.NOT_FOUND);
        const clientName = invoice.client?.name || invoice.clientName || 'Valued Guest';
        const phone = invoice.client?.phone || invoice.client?.whatsapp || invoice.clientPhone;
        if (!phone) {
            throw new errorHandler_1.AppError('Cannot send payment confirmation for invoice without recipient phone', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        if (invoice.status !== client_1.InvoiceStatus.PAID) {
            throw new errorHandler_1.AppError(`Payment confirmation is only sent for PAID invoices (current status: ${invoice.status})`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const lastPayment = invoice.payments[0];
        const paymentMethod = lastPayment ? lastPayment.paymentMethod : 'CASH';
        const loyaltyPoints = invoice.client?.loyalty?.balance || 0;
        const idempotencyKey = `payment-confirmation:${invoice.id}`;
        const itemsList = invoice.items && invoice.items.length > 0
            ? invoice.items.map((it) => `• ${it.name} (${Number(it.price).toLocaleString()} FCFA)`).join('\n')
            : '• Prestations & Soins';
        // Generate or fetch feedback token for this invoice payment
        let feedbackToken = null;
        if (invoice.appointmentId) {
            const fb = await database_1.default.clientFeedback.findFirst({ where: { appointmentId: invoice.appointmentId } });
            feedbackToken = fb?.token || null;
        }
        if (!feedbackToken && invoice.clientId) {
            const fb = await database_1.default.clientFeedback.findFirst({
                where: { clientId: invoice.clientId },
                orderBy: { createdAt: 'desc' },
            });
            feedbackToken = fb?.token || null;
        }
        if (!feedbackToken) {
            const token = `fb-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
            const fb = await database_1.default.clientFeedback.create({
                data: {
                    clientId: invoice.clientId || null,
                    appointmentId: invoice.appointmentId || null,
                    token,
                    rating: 0,
                    isSubmitted: false,
                },
            });
            feedbackToken = fb.token;
        }
        const frontendBaseUrl = process.env.FRONTEND_URL || 'https://omega-spa-pos.netlify.app';
        const feedbackLink = `${frontendBaseUrl}/feedback?token=${feedbackToken}`;
        return {
            eventType: 'PAYMENT_CONFIRMATION',
            idempotencyKey,
            clientId: invoice.clientId || undefined,
            invoiceId: invoice.id,
            recipient: {
                clientId: invoice.clientId || undefined,
                name: clientName,
                phone: phone || undefined,
            },
            placeholders: {
                clientName,
                amount: Number(invoice.total),
                invoiceNumber: invoice.invoiceNumber,
                paymentMethod,
                loyaltyPoints,
                itemsList,
                feedbackLink,
            },
        };
    }
    /**
     * 6. Rebooking Reminder Event
     * Strictly enforces minimum 30-day inactivity threshold and monthly idempotency key
     */
    async buildRebookingEvent(clientId, businessDate = new Date().toISOString().split('T')[0]) {
        const client = await database_1.default.client.findUnique({
            where: { id: clientId },
            include: {
                appointments: {
                    where: { status: { not: 'CANCELLED' } },
                    orderBy: { appointmentDate: 'desc' },
                    take: 10,
                },
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!client)
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        const now = new Date();
        const candidateTimes = [];
        if (client.lastVisitAt) {
            candidateTimes.push(new Date(client.lastVisitAt).getTime());
        }
        for (const appt of (client.appointments || [])) {
            if (appt.appointmentDate)
                candidateTimes.push(new Date(appt.appointmentDate).getTime());
            if (appt.createdAt)
                candidateTimes.push(new Date(appt.createdAt).getTime());
        }
        for (const inv of (client.invoices || [])) {
            if (inv.date)
                candidateTimes.push(new Date(inv.date).getTime());
            if (inv.createdAt)
                candidateTimes.push(new Date(inv.createdAt).getTime());
        }
        if (candidateTimes.length === 0) {
            throw new errorHandler_1.AppError(`Client ${client.name} has no recorded past visits. Rebooking reminder requires at least 1 completed visit.`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const mostRecentActivityTime = Math.max(...candidateTimes);
        const daysInactive = Math.floor((now.getTime() - mostRecentActivityTime) / (1000 * 60 * 60 * 24));
        if (daysInactive < 30) {
            throw new errorHandler_1.AppError(`Client ${client.name} is not eligible for rebooking: last visit or activity was only ${Math.max(0, daysInactive)} days ago (minimum 30 days required).`, constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const rawPhone = client.phone || client.whatsapp || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const monthBucket = businessDate.substring(0, 7); // e.g. '2026-10'
        const idempotencyKey = `rebooking:${cleanPhone || client.id}:${monthBucket}`;
        return {
            eventType: 'REBOOKING',
            idempotencyKey,
            clientId: client.id,
            recipient: {
                clientId: client.id,
                name: client.name,
                phone: rawPhone || undefined,
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
    async buildDailyCloseEvent(businessDate, authUserId, recipientPhoneOverride) {
        const startOfDay = new Date(`${businessDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${businessDate}T23:59:59.999Z`);
        // 1. All payments recorded for this day
        const payments = await database_1.default.payment.findMany({
            where: {
                paidAt: { gte: startOfDay, lte: endOfDay },
            },
        });
        // 2. All paid invoices on this business date
        const paidInvoices = await database_1.default.invoice.findMany({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
                status: client_1.InvoiceStatus.PAID,
            },
            include: {
                payments: true,
            },
        });
        let totalRevenue = 0;
        let cashAmount = 0;
        let momoAmount = 0;
        let orangeAmount = 0;
        const countedInvoiceIds = new Set();
        for (const p of payments) {
            const amt = Number(p.amount);
            totalRevenue += amt;
            if (p.paymentMethod === 'CASH')
                cashAmount += amt;
            if (p.paymentMethod === 'MTN_MOMO')
                momoAmount += amt;
            if (p.paymentMethod === 'ORANGE_MONEY')
                orangeAmount += amt;
            if (p.invoiceId)
                countedInvoiceIds.add(p.invoiceId);
        }
        // Failsafe: Include revenue from paid invoices that do not have a separate payment record
        for (const inv of paidInvoices) {
            if (!countedInvoiceIds.has(inv.id) && inv.payments.length === 0) {
                const invTotal = Number(inv.total || 0);
                if (invTotal > 0) {
                    totalRevenue += invTotal;
                    cashAmount += invTotal; // default to cash if no method specified
                }
            }
        }
        // 3. Clients served: count completed appointments + walk-in / direct paid invoices
        const completedAppointmentsCount = await database_1.default.appointment.count({
            where: {
                appointmentDate: { gte: startOfDay, lte: endOfDay },
                status: client_1.AppointmentStatus.COMPLETED,
            },
        });
        const walkInPaidInvoicesCount = await database_1.default.invoice.count({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
                status: client_1.InvoiceStatus.PAID,
                appointmentId: null,
            },
        });
        const clientsServed = completedAppointmentsCount + walkInPaidInvoicesCount;
        let recipientPhone = recipientPhoneOverride;
        if (!recipientPhone) {
            try {
                const { whatsappService } = require('../whatsapp/whatsapp.service');
                const phone = whatsappService.getBossPhoneNumber();
                if (phone)
                    recipientPhone = phone;
            }
            catch (e) { }
        }
        let managerName = 'Manager';
        if (authUserId && authUserId !== 'system') {
            const managerProfile = await database_1.default.staffProfile.findUnique({
                where: { userId: authUserId },
            });
            if (managerProfile?.name)
                managerName = managerProfile.name;
            if (!recipientPhone && managerProfile?.phone) {
                recipientPhone = managerProfile.phone;
            }
        }
        if (!recipientPhone) {
            try {
                const managerUser = await database_1.default.user.findFirst({
                    where: { role: { name: 'MANAGER' }, isActive: true },
                    include: { staffProfile: true },
                });
                recipientPhone = managerUser?.staffProfile?.phone || managerUser?.phone || undefined;
            }
            catch (e) { }
        }
        const finalPhone = recipientPhone || '+237676761349';
        const idempotencyKey = `daily-close:${businessDate}`;
        return {
            eventType: 'DAILY_CLOSE_BOSS',
            idempotencyKey,
            recipient: {
                name: managerName,
                phone: finalPhone,
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
exports.NotificationEventBuilder = NotificationEventBuilder;
exports.notificationEventBuilder = new NotificationEventBuilder();
//# sourceMappingURL=notification-event.builder.js.map