"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = exports.WhatsAppService = void 0;
exports.normalizeAutomationType = normalizeAutomationType;
const database_1 = __importDefault(require("../../config/database"));
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const whatsapp_types_1 = require("./whatsapp.types");
const whatsapp_adapter_1 = require("./whatsapp.adapter");
const notification_event_builder_1 = require("../notifications/notification-event.builder");
const invoice_pdf_service_1 = require("../invoices/invoice-pdf.service");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../../utils/logger");
const chatbot_service_1 = require("./chatbot/chatbot.service");
function normalizeAutomationType(input) {
    const up = (input || '').toUpperCase().replace(/-/g, '_');
    if (up === 'BIRTHDAY_GREETING' || up === 'BIRTHDAY')
        return whatsapp_types_1.WhatsAppAutomationType.BIRTHDAY;
    if (up === 'ANNIVERSARY_GREETING' || up === 'ANNIVERSARY')
        return whatsapp_types_1.WhatsAppAutomationType.ANNIVERSARY;
    if (up === 'DAILY_CLOSE_SUMMARY' || up === 'DAILY_CLOSE_BOSS' || up === 'DAILY_CLOSE')
        return whatsapp_types_1.WhatsAppAutomationType.DAILY_CLOSE_BOSS;
    if (up === 'REBOOKING_REMINDER' || up === 'REBOOKING')
        return whatsapp_types_1.WhatsAppAutomationType.REBOOKING;
    if (up === 'APPOINTMENT_REMINDER_24H' || up === 'APPOINTMENT_24H')
        return whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_24H;
    if (up === 'APPOINTMENT_REMINDER_2H' || up === 'APPOINTMENT_2H')
        return whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_2H;
    if (up === 'AFTER_SERVICE_THANK_YOU' || up === 'AFTER_SERVICE')
        return whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE;
    if (up === 'INVOICE_CONFIRMATION' || up === 'PAYMENT_CONFIRMATION')
        return whatsapp_types_1.WhatsAppAutomationType.PAYMENT_CONFIRMATION;
    return up;
}
class WhatsAppService {
    /**
     * Default message templates for all 8 automations.
     */
    defaultTemplates = {
        BIRTHDAY: {
            template: 'Happy Birthday {clientName}! Celebrate your special day at OMEGA SPA with {rewardPoints} bonus loyalty points on us. Book your pampering session today!',
            timing: '09:00',
        },
        ANNIVERSARY: {
            template: 'Happy Anniversary {clientName}! Wishing you wonderful memories from all of us at OMEGA SPA. Enjoy our luxury relaxation treatments!',
            timing: '09:00',
        },
        APPOINTMENT_24H: {
            template: 'Hello {clientName}, this is a reminder for your appointment tomorrow at {appointmentTime} for {service} with {technician} at OMEGA SPA. See you soon!',
            timing: '24h',
        },
        APPOINTMENT_2H: {
            template: 'Hello {clientName}, your appointment at OMEGA SPA is in 2 hours ({appointmentTime}) for {service}. We are preparing for your visit!',
            timing: '2h',
        },
        AFTER_SERVICE: {
            template: 'Thank you {clientName} for visiting OMEGA SPA! 🌿 We hope you enjoyed your {service} with {technician}. Your current loyalty points balance: {loyaltyPoints} points.\n\n⭐ We value your feedback! Rate your experience here:\n{feedbackLink}\n\n— OMEGA SPA, Douala',
            timing: 'immediate',
        },
        PAYMENT_CONFIRMATION: {
            template: '🧾 *OMEGA SPA — Reçu / Receipt*\nFacture: {invoiceNumber}\nClient: {clientName}\n\n*Prestations / Services:*\n{itemsList}\n\n*Total Payé / Paid:* {amount} FCFA ({paymentMethod})\n*Points Fidélité / Loyalty:* {loyaltyPoints} pts\n\n⭐ *Votre avis compte pour nous / Rate your experience:*\n{feedbackLink}\n\nMerci pour votre visite chez OMEGA SPA ! 🌿\nBonamousadi, Douala · Tél: +237 6 53 14 62 69',
            timing: 'immediate',
        },
        REBOOKING: {
            template: 'Hello {clientName}, it has been {daysInactive} days since your last visit at OMEGA SPA. Your wellness routine misses you! Enjoy {discount}% off your next session. Contact us today to book!',
            timing: '10:00',
        },
        DAILY_CLOSE_BOSS: {
            template: 'OMEGA SPA Daily Close Summary ({todayDate}): Total Revenue: {totalRevenue} FCFA | Clients Served: {clientsServed} | Cash: {cashAmount} FCFA | MoMo: {momoAmount} FCFA | Orange: {orangeAmount} FCFA.',
            timing: '19:30',
        },
        CLIENT_WELCOME: {
            template: "Hello {clientName}! 😊 We’d love to welcome you to Omega Spa.\n\nIt’s the perfect time to take a break and treat yourself to some relaxation. ✨ Contact us or book your appointment whenever you're ready.\n\nWe look forward to seeing you soon! 💚",
            timing: 'immediate',
        },
    };
    hasSeeded = false;
    /**
     * Automatically ensure default templates are seeded in database if table is empty.
     */
    async ensureSeededAutomations() {
        if (this.hasSeeded)
            return;
        this.hasSeeded = true;
        // Purge legacy duplicate types from early schema
        await database_1.default.whatsAppAutomation.deleteMany({
            where: {
                type: {
                    in: [
                        'APPOINTMENT_REMINDER',
                        'INVOICE_THANKYOU',
                        'DAILY_SUMMARY',
                    ],
                },
            },
        }).catch(() => { });
        for (const [type, data] of Object.entries(this.defaultTemplates)) {
            if (!data)
                continue;
            const autoType = type;
            await database_1.default.whatsAppAutomation.upsert({
                where: { type: autoType },
                update: {},
                create: {
                    type: autoType,
                    template: data.template,
                    timing: data.timing,
                    isActive: true,
                },
            });
        }
    }
    /**
     * Get all automation configurations (strictly the 9 active canonical types).
     */
    async getAutomations() {
        await this.ensureSeededAutomations();
        return database_1.default.whatsAppAutomation.findMany({
            where: {
                type: {
                    notIn: [
                        'APPOINTMENT_REMINDER',
                        'INVOICE_THANKYOU',
                        'DAILY_SUMMARY',
                    ],
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    /**
     * Get single automation configuration.
     */
    async getAutomationByType(type) {
        await this.ensureSeededAutomations();
        const item = await database_1.default.whatsAppAutomation.findUnique({
            where: { type },
        });
        if (!item) {
            throw new errorHandler_1.AppError(`Automation setting for ${type} not found`, constants_1.HTTP_STATUS.NOT_FOUND);
        }
        return item;
    }
    /**
     * Update automation configuration (Manager only).
     * Direct upsert executes in a single database round-trip (~100-200ms).
     */
    async updateAutomation(type, input) {
        const activeFlag = input.isActive !== undefined ? input.isActive : input.enabled;
        const timeVal = input.timing !== undefined ? input.timing : input.scheduleTime;
        const defaultData = this.defaultTemplates[type];
        const updated = await database_1.default.whatsAppAutomation.upsert({
            where: { type },
            create: {
                type,
                template: input.template !== undefined ? input.template.trim() : (defaultData?.template || ''),
                isActive: activeFlag !== undefined ? activeFlag : true,
                timing: timeVal !== undefined ? (timeVal ? timeVal.trim() : null) : (defaultData?.timing || null),
            },
            update: {
                template: input.template !== undefined ? input.template.trim() : undefined,
                isActive: activeFlag !== undefined ? activeFlag : undefined,
                timing: timeVal !== undefined ? (timeVal ? timeVal.trim() : null) : undefined,
            },
        });
        if (timeVal && typeof timeVal === 'string') {
            try {
                const { rescheduleWhatsAppJob } = require('./whatsapp.scheduler');
                rescheduleWhatsAppJob(type, timeVal.trim());
            }
            catch (err) {
                logger_1.logger.warn('[WhatsApp Service] Dynamic reschedule could not be triggered:', err?.message || err);
            }
        }
        return updated;
    }
    /**
     * Compiles template string by substituting placeholders with real data.
     */
    compileTemplate(template, placeholders) {
        return notification_event_builder_1.notificationEventBuilder.compileTemplate(template, placeholders);
    }
    /**
     * Core dispatch logic with strict idempotency check and audit logging.
     */
    async dispatchMessage(params) {
        const { recipientPhone, message, idempotencyKey, automationType, clientId, appointmentId, invoiceId, templateName, templateVariables, templateLanguage, skipActiveCheck, } = params;
        // 1. Strict Idempotency Check: Verify if message already logged with this key
        const existingLog = await database_1.default.whatsAppMessageLog.findUnique({
            where: { idempotencyKey },
        });
        if (existingLog) {
            return {
                alreadySent: true,
                log: existingLog,
            };
        }
        // Secondary check: prevent duplicate sent/queued automation messages for the same appointment
        if (appointmentId && automationType) {
            const existingByAppt = await database_1.default.whatsAppMessageLog.findFirst({
                where: {
                    appointmentId,
                    automationType,
                    status: { in: ['SENT', 'DELIVERED', 'QUEUED'] },
                },
            });
            if (existingByAppt) {
                return {
                    alreadySent: true,
                    log: existingByAppt,
                };
            }
        }
        // Secondary check for invoice feedback: prevent duplicate sent/queued feedback messages for the same invoice
        if (invoiceId && automationType === whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE) {
            const existingByInv = await database_1.default.whatsAppMessageLog.findFirst({
                where: {
                    invoiceId,
                    automationType: whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE,
                    status: { in: ['SENT', 'DELIVERED', 'QUEUED'] },
                },
            });
            if (existingByInv) {
                logger_1.logger.info(`[WhatsApp Dispatch] Feedback already sent for invoice ${invoiceId}. Skipping duplicate.`);
                return {
                    alreadySent: true,
                    log: existingByInv,
                };
            }
        }
        // Secondary check B: Strict 30-day anti-spam cooldown specifically for REBOOKING marketing messages
        if (automationType === whatsapp_types_1.WhatsAppAutomationType.REBOOKING && (recipientPhone || clientId)) {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const existingRebooking = await database_1.default.whatsAppMessageLog.findFirst({
                where: {
                    automationType: whatsapp_types_1.WhatsAppAutomationType.REBOOKING,
                    OR: [
                        ...(recipientPhone ? [{ recipientPhone }] : []),
                        ...(clientId ? [{ clientId }] : []),
                    ],
                    status: { in: ['SENT', 'DELIVERED', 'QUEUED'] },
                    createdAt: { gte: thirtyDaysAgo },
                },
            });
            if (existingRebooking) {
                logger_1.logger.info(`[WhatsApp Dispatch] Skipping rebooking for ${recipientPhone || clientId}: message already sent within 30 days.`);
                return {
                    alreadySent: true,
                    log: existingRebooking,
                };
            }
        }
        // 2. Check if automation is active
        if (automationType && !skipActiveCheck) {
            const setting = await database_1.default.whatsAppAutomation.findUnique({
                where: { type: automationType },
            });
            if (setting && !setting.isActive) {
                const skippedLog = await database_1.default.whatsAppMessageLog.create({
                    data: {
                        clientId,
                        invoiceId,
                        appointmentId,
                        automationType,
                        recipientPhone,
                        message,
                        status: 'SKIPPED',
                        failureReason: `Automation ${automationType} is currently disabled`,
                        idempotencyKey,
                    },
                });
                return { alreadySent: false, log: skippedLog };
            }
        }
        // Build Meta template metadata if templateName is provided
        let metadata = undefined;
        if (templateName) {
            const resolvedLanguage = templateLanguage ||
                ([
                    'client_welcome',
                    'appointment_booking_confirmation',
                    'appointment_reminder',
                    'appointment_reminder_2h',
                    'payment_confirmation_',
                    'service_thank_you',
                    'service_feedback_request',
                    'birthday_greeting',
                    'anniversary_greeting',
                    'rebooking_reminder',
                    'daily_close_summary',
                    'invoice_pdf_receipt',
                ].includes(templateName)
                    ? 'en'
                    : 'en_US');
            metadata = {
                template: {
                    name: templateName,
                    language: resolvedLanguage,
                    components: templateVariables && templateVariables.length > 0
                        ? [
                            {
                                type: 'body',
                                parameters: templateVariables.map((v) => ({
                                    type: 'text',
                                    text: String(v ?? ''),
                                })),
                            },
                        ]
                        : undefined,
                },
            };
        }
        // 3. Dispatch via generic provider adapter interface (template message only)
        // NOTE: Plain text fallback removed — it only works within 24h conversation windows,
        // causing inconsistent delivery (works for clients who messaged first, fails for others).
        // All automated messages must use Meta-approved templates for reliable delivery.
        const sendResult = await whatsapp_adapter_1.whatsappAdapter.send({
            channel: 'WHATSAPP',
            recipient: { phone: recipientPhone, clientId },
            content: message,
            idempotencyKey,
            metadata,
        });
        // 4. Record in WhatsAppMessageLog
        const now = new Date();
        const createdLog = await database_1.default.whatsAppMessageLog.create({
            data: {
                clientId,
                invoiceId,
                appointmentId,
                automationType,
                recipientPhone,
                message,
                providerMessageId: sendResult.providerMessageId || null,
                status: sendResult.status,
                failureReason: sendResult.failureReason || null,
                idempotencyKey,
                sentAt: sendResult.status === 'SENT' ? now : null,
            },
        });
        // 5. Log to ClientHistory if client is associated
        if (clientId) {
            await database_1.default.clientHistory.create({
                data: {
                    clientId,
                    action: 'WHATSAPP_MESSAGE_SENT',
                    details: `WhatsApp notification (${automationType || 'CUSTOM'}): ${createdLog.status}`,
                },
            });
        }
        return {
            alreadySent: false,
            log: createdLog,
        };
    }
    /**
     * 1. Birthday greeting trigger
     */
    async triggerBirthday(clientId, year = new Date().getFullYear()) {
        const event = await notification_event_builder_1.notificationEventBuilder.buildBirthdayEvent(clientId, year);
        const setting = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.BIRTHDAY);
        const message = this.compileTemplate(setting.template, event.placeholders);
        return this.dispatchMessage({
            recipientPhone: event.recipient.phone || '',
            message,
            idempotencyKey: event.idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.BIRTHDAY,
            clientId: event.clientId,
            templateName: 'birthday_greeting',
            templateLanguage: 'en',
            templateVariables: [
                String(event.placeholders.clientName || 'Valued Guest'),
                String(event.placeholders.rewardPoints || '500'),
            ],
        });
    }
    /**
     * 2. Anniversary greeting trigger
     */
    async triggerAnniversary(clientId, year = new Date().getFullYear()) {
        const event = await notification_event_builder_1.notificationEventBuilder.buildAnniversaryEvent(clientId, year);
        const setting = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.ANNIVERSARY);
        const message = this.compileTemplate(setting.template, event.placeholders);
        return this.dispatchMessage({
            recipientPhone: event.recipient.phone || '',
            message,
            idempotencyKey: event.idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.ANNIVERSARY,
            clientId: event.clientId,
            templateName: 'anniversary_greeting',
            templateLanguage: 'en',
            templateVariables: [
                String(event.placeholders.clientName || 'Valued Guest'),
            ],
        });
    }
    /**
     * Process Celebration Greetings (Birthday & Anniversary)
     */
    async processCelebrationReminders() {
        await this.ensureSeededAutomations();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
        const currentDay = String(now.getUTCDate()).padStart(2, '0');
        const todayMMDD = `${currentMonth}-${currentDay}`;
        const clients = await database_1.default.client.findMany({
            where: { isActive: true },
        });
        let birthdaysSent = 0;
        let anniversariesSent = 0;
        let skippedCount = 0;
        for (const client of clients) {
            if (client.birthday) {
                const bdayDate = new Date(client.birthday);
                const bdayMMDD = `${String(bdayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(bdayDate.getUTCDate()).padStart(2, '0')}`;
                if (bdayMMDD === todayMMDD) {
                    const res = await this.triggerBirthday(client.id, currentYear);
                    if (!res.alreadySent && res.log.status !== 'SKIPPED')
                        birthdaysSent++;
                    else
                        skippedCount++;
                }
            }
            if (client.anniversary) {
                const anniDate = new Date(client.anniversary);
                const anniMMDD = `${String(anniDate.getUTCMonth() + 1).padStart(2, '0')}-${String(anniDate.getUTCDate()).padStart(2, '0')}`;
                if (anniMMDD === todayMMDD) {
                    const res = await this.triggerAnniversary(client.id, currentYear);
                    if (!res.alreadySent && res.log.status !== 'SKIPPED')
                        anniversariesSent++;
                    else
                        skippedCount++;
                }
            }
        }
        return {
            processedClients: clients.length,
            birthdaysSent,
            anniversariesSent,
            skippedCount,
        };
    }
    /**
     * 3. Database-driven Scheduled Appointment Reminder Processor (24h and 2h)
     * Uses NotificationEventBuilder to query and assemble reminder events channel-independently.
     */
    async processScheduledReminders() {
        await this.ensureSeededAutomations();
        const { reminders24h, reminders2h, totalScheduled } = await notification_event_builder_1.notificationEventBuilder.buildScheduledReminderEvents();
        const setting24h = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_24H);
        const setting2h = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_2H);
        let reminders24hSent = 0;
        let reminders2hSent = 0;
        let skippedCount = 0;
        const errors = [];
        // Process 24h reminders
        for (const item of reminders24h) {
            const existing24h = await database_1.default.whatsAppMessageLog.findUnique({ where: { idempotencyKey: item.idempotencyKey } });
            if (!existing24h && setting24h.isActive) {
                const msg24h = this.compileTemplate(setting24h.template, item.placeholders);
                const res24h = await this.dispatchMessage({
                    recipientPhone: item.recipient.phone || '',
                    message: msg24h,
                    idempotencyKey: item.idempotencyKey,
                    automationType: whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_24H,
                    clientId: item.clientId,
                    appointmentId: item.appointmentId,
                    templateName: 'appointment_reminder',
                    templateLanguage: 'en',
                    templateVariables: [
                        String(item.placeholders.clientName || 'Valued Guest'),
                        String(item.placeholders.appointmentTime || '14:00'),
                        String(item.placeholders.service || 'Spa Treatment'),
                        String(item.placeholders.technician || 'Specialist'),
                    ],
                });
                if (res24h.log.status !== 'SKIPPED') {
                    reminders24hSent++;
                }
                else {
                    skippedCount++;
                }
            }
        }
        // Process 2h reminders
        for (const item of reminders2h) {
            const existing2h = await database_1.default.whatsAppMessageLog.findUnique({ where: { idempotencyKey: item.idempotencyKey } });
            if (!existing2h && setting2h.isActive) {
                const msg2h = this.compileTemplate(setting2h.template, item.placeholders);
                const res2h = await this.dispatchMessage({
                    recipientPhone: item.recipient.phone || '',
                    message: msg2h,
                    idempotencyKey: item.idempotencyKey,
                    automationType: whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_2H,
                    clientId: item.clientId,
                    appointmentId: item.appointmentId,
                    templateName: 'appointment_reminder_2h',
                    templateLanguage: 'en',
                    templateVariables: [
                        String(item.placeholders.clientName || 'Valued Guest'),
                        String(item.placeholders.appointmentTime || '14:00'),
                        String(item.placeholders.service || 'Spa Treatment'),
                        String(item.placeholders.technician || 'Specialist'),
                    ],
                });
                if (res2h.log.status !== 'SKIPPED') {
                    reminders2hSent++;
                }
                else {
                    skippedCount++;
                }
            }
        }
        return {
            processedCount: totalScheduled,
            reminders24h: reminders24hSent,
            reminders24hSent,
            reminders2h: reminders2hSent,
            reminders2hSent,
            skippedCount,
            errors,
        };
    }
    /**
     * 4. After-Service Thank You Trigger
     */
    async triggerAfterService(appointmentId) {
        // 1. Strict deduplication: check if feedback was already sent for this appointment
        const existingFeedback = await database_1.default.whatsAppMessageLog.findFirst({
            where: {
                appointmentId,
                automationType: whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE,
                status: { in: ['SENT', 'DELIVERED', 'QUEUED'] },
            },
        });
        if (existingFeedback) {
            logger_1.logger.info(`[WhatsApp] Feedback already sent for appointment ${appointmentId}. Skipping duplicate.`);
            return { alreadySent: true, log: existingFeedback };
        }
        const event = await notification_event_builder_1.notificationEventBuilder.buildAfterServiceEvent(appointmentId);
        const setting = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE);
        const message = this.compileTemplate(setting.template, event.placeholders);
        const idempotencyKey = `after-service:${appointmentId}`;
        return this.dispatchMessage({
            recipientPhone: event.recipient.phone || '',
            message,
            idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE,
            clientId: event.clientId,
            appointmentId: event.appointmentId,
            templateName: 'service_feedback_request',
            templateLanguage: 'en',
            templateVariables: [
                String(event.placeholders.clientName || 'Valued Guest'),
                String(event.placeholders.service || 'Spa Treatment'),
                String(event.placeholders.technician || 'Specialist'),
                String(event.placeholders.loyaltyPoints || '0'),
                String(event.placeholders.feedbackLink || 'https://omega-spa-pos.netlify.app'),
            ],
        });
    }
    /**
     * 5. Payment Confirmation Trigger
     */
    async triggerPaymentConfirmation(invoiceId) {
        const event = await notification_event_builder_1.notificationEventBuilder.buildPaymentConfirmationEvent(invoiceId);
        const setting = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.PAYMENT_CONFIRMATION);
        const message = this.compileTemplate(setting.template, event.placeholders);
        const paymentResult = await this.dispatchMessage({
            recipientPhone: event.recipient.phone || '',
            message,
            idempotencyKey: event.idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.PAYMENT_CONFIRMATION,
            clientId: event.clientId,
            invoiceId: event.invoiceId,
            templateName: 'payment_confirmation_',
            templateLanguage: 'en',
            templateVariables: [
                String(event.placeholders.clientName || 'Valued Guest'),
                Number(event.placeholders.amount || 0).toLocaleString(),
                String(event.placeholders.invoiceNumber || 'INV-0001'),
                String(event.placeholders.paymentMethod || 'Cash'),
                String(event.placeholders.loyaltyPoints || '0'),
            ],
        });
        return paymentResult;
    }
    /**
     * Check if a receipt was already sent for this invoice
     */
    async getInvoiceReceiptStatus(invoiceId) {
        const existingLog = await database_1.default.whatsAppMessageLog.findFirst({
            where: {
                invoiceId,
                automationType: whatsapp_types_1.WhatsAppAutomationType.PAYMENT_CONFIRMATION,
                status: 'SENT',
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            alreadySent: Boolean(existingLog),
            lastSentAt: existingLog?.sentAt || existingLog?.createdAt || null,
            recipientPhone: existingLog?.recipientPhone || null,
            messageId: existingLog?.id || null,
        };
    }
    /**
     * Send official Invoice PDF as an attached document via WhatsApp Cloud API
     */
    async sendInvoicePdf(invoiceId, recipientPhoneOverride) {
        const invoice = await database_1.default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: {
                    include: { loyalty: true },
                },
                payments: {
                    orderBy: { paidAt: 'desc' },
                    take: 1,
                },
                items: true,
            },
        });
        if (!invoice)
            throw new errorHandler_1.AppError('Invoice not found', constants_1.HTTP_STATUS.NOT_FOUND);
        const phone = recipientPhoneOverride || invoice.client?.phone || invoice.client?.whatsapp;
        if (!phone)
            throw new errorHandler_1.AppError('Client has no phone number on file', constants_1.HTTP_STATUS.BAD_REQUEST);
        // 1. Generate PDF buffer
        const { buffer, filename } = await invoice_pdf_service_1.invoicePdfService.generateInvoicePdf(invoiceId);
        // Look up or generate feedback token so EVERY receipt includes feedback link
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
        const feedbackText = feedbackToken ? `\n\n⭐ Votre avis compte pour nous / Rate your experience:\n${frontendBaseUrl}/feedback?token=${feedbackToken}` : '';
        const caption = `🧾 *Reçu Officiel OMEGA SPA* — Facture ${invoice.invoiceNumber || invoice.id.slice(0, 8)}\nTotal: ${Number(invoice.total).toLocaleString()} FCFA${feedbackText}\n\nMerci pour votre visite ! 🌿`;
        // 2. Dispatch document via Meta API (tries invoice_pdf_receipt template first)
        const result = await whatsapp_adapter_1.whatsappAdapter.sendDocument({
            recipientPhone: phone,
            buffer,
            filename,
            caption,
            template: {
                name: 'invoice_pdf_receipt',
                language: 'en',
                variables: [
                    invoice.client?.name || 'Valued Guest',
                    Number(invoice.total || 0).toLocaleString(),
                    invoice.invoiceNumber || invoice.id.slice(0, 8),
                    invoice.payments?.[0]?.paymentMethod || 'Cash',
                    invoice.client?.loyalty?.balance || 0,
                ],
            },
        });
        // 3. Log dispatch
        const now = new Date();
        const log = await database_1.default.whatsAppMessageLog.create({
            data: {
                clientId: invoice.clientId,
                invoiceId: invoice.id,
                automationType: whatsapp_types_1.WhatsAppAutomationType.PAYMENT_CONFIRMATION,
                recipientPhone: phone,
                message: `[PDF Attachment] ${filename} - ${caption}`,
                providerMessageId: result.providerMessageId || null,
                status: result.status,
                failureReason: result.failureReason || null,
                idempotencyKey: `invoice-pdf:${invoice.id}:${Date.now()}`,
                sentAt: result.status === 'SENT' ? now : null,
            },
        });
        if (invoice.clientId) {
            await database_1.default.clientHistory.create({
                data: {
                    clientId: invoice.clientId,
                    action: 'WHATSAPP_MESSAGE_SENT',
                    details: `WhatsApp PDF Receipt dispatched (${filename}): ${result.status}`,
                },
            });
        }
        return {
            success: result.success,
            status: result.status,
            log,
            filename,
        };
    }
    /**
     * Dispatch feedback request with rating link immediately when payment is collected
     */
    async sendInvoiceFeedback(invoiceId, recipientPhoneOverride) {
        const invoice = await database_1.default.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                client: {
                    include: { loyalty: true },
                },
                items: true,
            },
        });
        if (!invoice)
            throw new errorHandler_1.AppError('Invoice not found', constants_1.HTTP_STATUS.NOT_FOUND);
        // 1. Strict deduplication check: If feedback was already dispatched for this invoice or appointment, skip immediately!
        const existingFeedbackLog = await database_1.default.whatsAppMessageLog.findFirst({
            where: {
                OR: [
                    { invoiceId: invoice.id },
                    ...(invoice.appointmentId ? [{ appointmentId: invoice.appointmentId }] : []),
                ],
                automationType: whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE,
                status: { in: ['SENT', 'DELIVERED', 'QUEUED'] },
            },
        });
        if (existingFeedbackLog) {
            logger_1.logger.info(`[WhatsApp] Feedback already sent for invoice ${invoice.id} or appointment ${invoice.appointmentId}. Skipping duplicate.`);
            return { alreadySent: true, log: existingFeedbackLog };
        }
        const phone = recipientPhoneOverride || invoice.client?.phone || invoice.client?.whatsapp || invoice.clientPhone;
        if (!phone)
            throw new errorHandler_1.AppError('Client has no phone number on file', constants_1.HTTP_STATUS.BAD_REQUEST);
        // Look up or generate feedback token
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
        const feedbackUrl = `${frontendBaseUrl}/feedback?token=${feedbackToken}`;
        const clientName = invoice.client?.name || invoice.clientName || 'Valued Guest';
        const serviceName = invoice.items?.[0]?.name || 'Prestations & Soins';
        const loyaltyBalance = invoice.client?.loyalty?.balance || 0;
        const feedbackMsg = `Bonjour ${clientName} ! Merci pour votre visite chez OMEGA SPA 🌿\n\n⭐ *Votre avis compte énormément pour nous !*\nDonnez votre note et votre avis en quelques secondes ici :\n${feedbackUrl}\n\nMerci et à très bientôt ! ✨\n— OMEGA SPA Douala`;
        return await this.dispatchMessage({
            recipientPhone: phone,
            message: feedbackMsg,
            idempotencyKey: `invoice-feedback:${invoice.id}`,
            automationType: whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE,
            clientId: invoice.clientId || undefined,
            invoiceId: invoice.id,
            appointmentId: invoice.appointmentId || undefined,
            templateName: 'service_feedback_request',
            templateLanguage: 'en',
            skipActiveCheck: true,
            templateVariables: [
                clientName,
                serviceName,
                'Specialist',
                String(loyaltyBalance),
                feedbackUrl,
            ],
        });
    }
    /**
     * 6. Rebooking Reminder Trigger with Anti-Spam Guards
     */
    async triggerRebooking(clientId, businessDate = new Date().toISOString().split('T')[0]) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // 1. Fetch client with full appointments and invoices check
        const client = await database_1.default.client.findUnique({
            where: { id: clientId },
            include: {
                appointments: {
                    where: {
                        status: { not: client_1.AppointmentStatus.CANCELLED },
                    },
                    orderBy: { appointmentDate: 'desc' },
                    take: 10,
                },
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!client) {
            throw new errorHandler_1.AppError('Client not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        // Guard A1: Skip if client already has an active upcoming appointment scheduled (today or future)
        const hasActiveUpcoming = (client.appointments || []).some((a) => (a.status === client_1.AppointmentStatus.SCHEDULED || a.status === client_1.AppointmentStatus.IN_PROGRESS) &&
            new Date(a.appointmentDate).getTime() >= startOfToday.getTime());
        if (hasActiveUpcoming) {
            logger_1.logger.info(`[WhatsApp Rebooking] Skipped client ${client.name} (${clientId}): Already has an active upcoming appointment.`);
            return {
                alreadySent: true,
                skipped: true,
                reason: 'Client already has an upcoming appointment scheduled',
                log: { status: 'SKIPPED' },
            };
        }
        // Guard A2: Skip if client visited or had an appointment within the last 30 days
        const hasRecentAppointment = (client.appointments || []).some((a) => new Date(a.appointmentDate).getTime() >= thirtyDaysAgo.getTime() ||
            (a.createdAt && new Date(a.createdAt).getTime() >= thirtyDaysAgo.getTime()));
        if (hasRecentAppointment) {
            logger_1.logger.info(`[WhatsApp Rebooking] Skipped client ${client.name} (${clientId}): Has visited or has appointment within the last 30 days.`);
            return {
                alreadySent: true,
                skipped: true,
                reason: 'Client has visited or has appointment within the last 30 days',
                log: { status: 'SKIPPED' },
            };
        }
        // Guard A3: Skip if client has an invoice created or dated within the last 30 days
        const hasRecentInvoice = (client.invoices || []).some((i) => new Date(i.createdAt).getTime() >= thirtyDaysAgo.getTime() ||
            (i.date && new Date(i.date).getTime() >= thirtyDaysAgo.getTime()));
        if (hasRecentInvoice) {
            logger_1.logger.info(`[WhatsApp Rebooking] Skipped client ${client.name} (${clientId}): Has an invoice or payment within the last 30 days.`);
            return {
                alreadySent: true,
                skipped: true,
                reason: 'Client has an invoice or payment within the last 30 days',
                log: { status: 'SKIPPED' },
            };
        }
        // Guard A4: Skip if client's lastVisitAt is within the last 30 days
        if (client.lastVisitAt && new Date(client.lastVisitAt).getTime() >= thirtyDaysAgo.getTime()) {
            logger_1.logger.info(`[WhatsApp Rebooking] Skipped client ${client.name} (${clientId}): lastVisitAt is within the last 30 days.`);
            return {
                alreadySent: true,
                skipped: true,
                reason: 'Client lastVisitAt is within the last 30 days',
                log: { status: 'SKIPPED' },
            };
        }
        // Guard B: Check 30-day anti-spam cooldown across WhatsAppMessageLog
        const clientPhone = client.phone || client.whatsapp;
        if (clientPhone) {
            const existingRecentLog = await database_1.default.whatsAppMessageLog.findFirst({
                where: {
                    automationType: whatsapp_types_1.WhatsAppAutomationType.REBOOKING,
                    recipientPhone: clientPhone,
                    status: { in: ['SENT', 'DELIVERED', 'QUEUED'] },
                    createdAt: { gte: thirtyDaysAgo },
                },
            });
            if (existingRecentLog) {
                logger_1.logger.info(`[WhatsApp Rebooking] Skipped client ${client.name} (${clientPhone}): Received rebooking reminder within last 30 days.`);
                return {
                    alreadySent: true,
                    skipped: true,
                    reason: 'Client received rebooking reminder within last 30 days',
                    log: existingRecentLog,
                };
            }
        }
        // 2. Build Event safely (checks >= 30 days threshold across all activity)
        let event;
        try {
            event = await notification_event_builder_1.notificationEventBuilder.buildRebookingEvent(clientId, businessDate);
        }
        catch (err) {
            logger_1.logger.info(`[WhatsApp Rebooking] Inactivity requirement not met for client ${clientId}: ${err?.message || err}`);
            return {
                alreadySent: true,
                skipped: true,
                reason: err?.message || 'Inactivity threshold not met',
                log: { status: 'SKIPPED' },
            };
        }
        const setting = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.REBOOKING);
        const message = this.compileTemplate(setting.template, event.placeholders);
        return this.dispatchMessage({
            recipientPhone: event.recipient.phone || '',
            message,
            idempotencyKey: event.idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.REBOOKING,
            clientId: event.clientId,
            templateName: 'rebooking_reminder',
            templateLanguage: 'en',
            templateVariables: [
                String(event.placeholders.clientName || 'Valued Guest'),
                String(event.placeholders.daysInactive || '30'),
                String(event.placeholders.discount || '10'),
            ],
        });
    }
    /**
     * Process Rebooking Reminders Batch
     * Strictly targets clients with completed visits >= 30 days ago, NO recent visits, NO recent invoices, and NO upcoming bookings.
     */
    async processRebookingReminders(clientId) {
        await this.ensureSeededAutomations();
        const todayStr = new Date().toISOString().split('T')[0];
        if (clientId) {
            const res = await this.triggerRebooking(clientId, todayStr);
            return {
                processedCount: 1,
                sentCount: !res.alreadySent && res.log?.status !== 'SKIPPED' ? 1 : 0,
                skippedCount: res.alreadySent || res.log?.status === 'SKIPPED' ? 1 : 0,
                details: [res],
            };
        }
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        // Query clients whose last visit is at least 30 days ago, who have NO recent appointments or invoices
        const inactiveClients = await database_1.default.client.findMany({
            where: {
                isActive: true,
                // Must NOT have lastVisitAt within the last 30 days
                OR: [
                    { lastVisitAt: { lte: thirtyDaysAgo } },
                    { lastVisitAt: null },
                ],
                // Must have at least 1 completed visit in history
                appointments: {
                    some: {
                        status: client_1.AppointmentStatus.COMPLETED,
                    },
                    // Must NOT have any appointment within the last 30 days
                    none: {
                        appointmentDate: { gte: thirtyDaysAgo },
                    },
                },
                // Must NOT have any invoice within the last 30 days
                invoices: {
                    none: {
                        createdAt: { gte: thirtyDaysAgo },
                    },
                },
            },
            take: 50,
        });
        let sentCount = 0;
        let skippedCount = 0;
        for (const client of inactiveClients) {
            const res = await this.triggerRebooking(client.id, todayStr);
            if (!res.alreadySent && res.log?.status !== 'SKIPPED') {
                sentCount++;
            }
            else {
                skippedCount++;
            }
        }
        return {
            processedCount: inactiveClients.length,
            sentCount,
            skippedCount,
        };
    }
    /**
     * 7. Daily Close Summary to Manager / Boss
     */
    async triggerDailyCloseBoss(input, authUser) {
        const now = new Date();
        const businessDate = input.businessDate || input.date || now.toISOString().split('T')[0];
        const targetRecipientPhone = (input.recipientPhone && input.recipientPhone.trim())
            ? input.recipientPhone.trim()
            : (this.getBossPhoneNumber() || '+237676761349');
        if (input.recipientPhone && input.recipientPhone.trim()) {
            await this.setBossPhoneNumber(input.recipientPhone.trim()).catch(() => { });
        }
        // Ensure DAILY_CLOSE_BOSS automation is active in database
        await database_1.default.whatsAppAutomation.upsert({
            where: { type: whatsapp_types_1.WhatsAppAutomationType.DAILY_CLOSE_BOSS },
            create: {
                type: whatsapp_types_1.WhatsAppAutomationType.DAILY_CLOSE_BOSS,
                isActive: true,
                template: 'OMEGA SPA Daily Close Summary ({todayDate}): Total Revenue: {totalRevenue} FCFA | Clients Served: {clientsServed} | Cash: {cashAmount} FCFA | MoMo: {momoAmount} FCFA | Orange: {orangeAmount} FCFA.',
                timing: '19:30',
            },
            update: {
                isActive: true,
            },
        }).catch(() => { });
        const event = await notification_event_builder_1.notificationEventBuilder.buildDailyCloseEvent(businessDate, authUser.id, targetRecipientPhone);
        const setting = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.DAILY_CLOSE_BOSS);
        const message = this.compileTemplate(setting.template, event.placeholders);
        // Timestamped idempotency key ensures manual clicks from Manager dashboard always dispatch
        const cleanDigits = targetRecipientPhone.replace(/[^\d]/g, '') || 'boss';
        const idempotencyKey = `daily-close:${businessDate}:${cleanDigits}:${Date.now()}`;
        const finalRecipientPhone = targetRecipientPhone || event.recipient.phone || '+237676761349';
        return this.dispatchMessage({
            recipientPhone: finalRecipientPhone,
            message,
            idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.DAILY_CLOSE_BOSS,
            templateName: 'daily_close_summary',
            templateLanguage: 'en',
            templateVariables: [
                String(event.placeholders.todayDate || businessDate),
                Number(event.placeholders.totalRevenue || 0).toLocaleString(),
                String(event.placeholders.clientsServed || '0'),
                Number(event.placeholders.cashAmount || 0).toLocaleString(),
                Number(event.placeholders.momoAmount || 0).toLocaleString(),
                Number(event.placeholders.orangeAmount || 0).toLocaleString(),
            ],
        });
    }
    /**
     * 8. Instant Appointment Confirmation — triggered immediately when appointment is created.
     * Uses the Meta-approved 'appointment_reminder' template to send confirmation.
     */
    async triggerAppointmentConfirmation(appointmentId) {
        const appointment = await database_1.default.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                client: true,
                mainTechnician: {
                    include: { staffProfile: true },
                },
                appointmentServices: {
                    include: { service: { select: { name: true } } },
                },
            },
        });
        if (!appointment || !appointment.client) {
            return { alreadySent: false, log: null, error: 'Appointment or client not found' };
        }
        const client = appointment.client;
        const phone = client.phone || client.whatsapp;
        if (!phone) {
            return { alreadySent: false, log: null, error: 'Client has no phone number' };
        }
        // Build service names
        const serviceNames = appointment.appointmentServices
            .map((as) => as.service?.name)
            .filter(Boolean)
            .join(', ') || appointment.serviceSummary || 'Spa Treatment';
        const technicianName = appointment.mainTechnician?.staffProfile?.name || 'Specialist';
        const appointmentDate = appointment.appointmentDate
            ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'TBD';
        const appointmentTime = appointment.appointmentTime || '14:00';
        const idempotencyKey = `appt-confirm:${appointmentId}`;
        const confirmationVariables = [
            client.name || 'Valued Guest',
            appointmentDate,
            appointmentTime,
            serviceNames,
            technicianName,
        ];
        const dispatchRes = await this.dispatchMessage({
            recipientPhone: phone,
            message: `Hello ${client.name}, your appointment at OMEGA SPA is confirmed for ${appointmentDate} at ${appointmentTime} for ${serviceNames} with ${technicianName}. See you soon!`,
            idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_REMINDER,
            clientId: client.id,
            appointmentId: appointment.id,
            templateName: 'appointment_booking_confirmation',
            templateLanguage: 'en',
            templateVariables: confirmationVariables,
        });
        // If the new appointment_booking_confirmation template is still PENDING Meta approval, fallback temporarily
        if (dispatchRes.log?.status === 'FAILED' && dispatchRes.log.failureReason?.toLowerCase().includes('pending')) {
            logger_1.logger.warn('[WhatsApp] appointment_booking_confirmation is still pending Meta approval. Using appointment_reminder fallback temporarily.');
            return this.dispatchMessage({
                recipientPhone: phone,
                message: `Hello ${client.name}, your appointment at OMEGA SPA is confirmed for ${appointmentDate} at ${appointmentTime} for ${serviceNames} with ${technicianName}. See you soon!`,
                idempotencyKey: `appt-confirm-fb:${appointmentId}`,
                automationType: whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_REMINDER,
                clientId: client.id,
                appointmentId: appointment.id,
                templateName: 'appointment_reminder',
                templateLanguage: 'en',
                templateVariables: [
                    client.name || 'Valued Guest',
                    appointmentTime,
                    serviceNames,
                    technicianName,
                ],
            });
        }
        return dispatchRes;
    }
    /**
     * 8b. Staff Appointment Alert — triggered when appointment is booked.
     * Sends instant notification to the assigned Barber / Technician via WhatsApp.
     */
    async triggerStaffAppointmentAlert(appointmentId) {
        const appointment = await database_1.default.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                client: true,
                mainTechnician: {
                    include: { staffProfile: true },
                },
                appointmentServices: {
                    include: { service: { select: { name: true } } },
                },
            },
        });
        if (!appointment || !appointment.mainTechnician) {
            return { alreadySent: false, log: null, error: 'Appointment or technician not found' };
        }
        const technician = appointment.mainTechnician;
        const staffProfile = technician.staffProfile;
        const staffPhone = staffProfile?.phone;
        if (!staffPhone || !staffPhone.trim()) {
            logger_1.logger.info(`[Appointments] Staff appointment alert skipped: technician "${staffProfile?.name || technician.email}" has no phone number`);
            return { alreadySent: false, log: null, error: 'Staff has no phone number configured' };
        }
        const technicianName = staffProfile?.name || technician.email || 'Specialist';
        const clientName = appointment.client?.name || 'Client';
        const serviceNames = appointment.appointmentServices
            .map((as) => as.service?.name)
            .filter(Boolean)
            .join(', ') || appointment.serviceSummary || 'Spa Service';
        const appointmentDate = appointment.appointmentDate
            ? new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Today';
        const appointmentTime = appointment.appointmentTime || 'TBD';
        const idempotencyKey = `staff-appt-alert:${appointmentId}:${technician.id}`;
        return this.dispatchMessage({
            recipientPhone: staffPhone,
            message: `Hello ${technicianName}, you have a new appointment assigned at OMEGA SPA!\n\nClient: ${clientName}\nService: ${serviceNames}\nDate & Time: ${appointmentDate} at ${appointmentTime}\n\nPlease ensure your workstation is prepared and be ready to welcome your client.`,
            idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_REMINDER,
            clientId: appointment.clientId,
            appointmentId: appointment.id,
            templateName: 'staff_appointment_alert',
            templateLanguage: 'en_US',
            templateVariables: [
                technicianName,
                clientName,
                serviceNames,
                appointmentDate,
                appointmentTime,
            ],
        });
    }
    /**
     * 9. Instant New Client Welcome — triggered automatically when a new client is added to the system.
     */
    async triggerClientWelcome(clientId) {
        const client = await database_1.default.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            return { alreadySent: false, log: null, error: 'Client not found' };
        }
        const phone = client.phone || client.whatsapp;
        if (!phone || !phone.trim()) {
            return { alreadySent: false, log: null, error: 'Client has no phone number' };
        }
        const clientName = client.name ? client.name.trim() : 'Valued Guest';
        const setting = await this.getAutomationByType(whatsapp_types_1.WhatsAppAutomationType.CLIENT_WELCOME);
        const message = this.compileTemplate(setting.template, { clientName });
        const idempotencyKey = `client-welcome:${clientId}`;
        return this.dispatchMessage({
            recipientPhone: phone.trim(),
            message,
            idempotencyKey,
            automationType: whatsapp_types_1.WhatsAppAutomationType.CLIENT_WELCOME,
            clientId: client.id,
            templateName: 'client_welcome',
            templateLanguage: 'en',
            templateVariables: [clientName],
        });
    }
    /**
     * 10. Custom / Direct templated dispatch
     */
    async sendCustomMessage(input) {
        const idempotencyKey = input.idempotencyKey || `custom:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
        return this.dispatchMessage({
            recipientPhone: input.recipientPhone,
            message: input.message,
            idempotencyKey,
            automationType: input.automationType,
            clientId: input.clientId,
            appointmentId: input.appointmentId,
            invoiceId: input.invoiceId,
        });
    }
    /**
     * Message Logs query with filters and pagination
     */
    async getMessageLogs(query) {
        const page = Math.max(1, parseInt(String(query.page || 1), 10));
        const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.automationType)
            where.automationType = query.automationType;
        if (query.clientId)
            where.clientId = query.clientId;
        if (query.appointmentId)
            where.appointmentId = query.appointmentId;
        if (query.invoiceId)
            where.invoiceId = query.invoiceId;
        if (query.phone)
            where.recipientPhone = { contains: query.phone.trim() };
        if (query.search && query.search.trim()) {
            const q = query.search.trim();
            where.OR = [
                { recipientPhone: { contains: q } },
                { message: { contains: q } },
                { client: { name: { contains: q } } },
            ];
        }
        const [total, logs] = await Promise.all([
            database_1.default.whatsAppMessageLog.count({ where }),
            database_1.default.whatsAppMessageLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    client: { select: { id: true, name: true, phone: true } },
                    appointment: { select: { id: true, appointmentDate: true, appointmentTime: true, serviceSummary: true } },
                    invoice: { select: { id: true, invoiceNumber: true, total: true } },
                },
            }),
        ]);
        return {
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Purge old WhatsApp message logs
     * @param daysThreshold Number of days (default 30)
     */
    async purgeOldMessageLogs(daysThreshold = 30) {
        const safeDays = Math.max(1, Math.min(365, daysThreshold));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - safeDays);
        const result = await database_1.default.whatsAppMessageLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });
        return {
            deletedCount: result.count,
            cutoffDate,
        };
    }
    retentionFilePath = path_1.default.join(process.cwd(), 'whatsapp_retention.json');
    getRetentionDays() {
        try {
            if (fs_1.default.existsSync(this.retentionFilePath)) {
                const raw = fs_1.default.readFileSync(this.retentionFilePath, 'utf8');
                const data = JSON.parse(raw);
                if (typeof data.days === 'number' && data.days > 0)
                    return data.days;
            }
        }
        catch (e) {
            // fallback to 30
        }
        return 30;
    }
    setRetentionDays(days) {
        const safeDays = Math.max(1, Math.min(365, parseInt(String(days), 10) || 30));
        try {
            fs_1.default.writeFileSync(this.retentionFilePath, JSON.stringify({ days: safeDays, updatedAt: new Date().toISOString() }), 'utf8');
        }
        catch (e) {
            logger_1.logger.warn('[WhatsApp Service] Could not write retention file', { error: e?.message });
        }
        return safeDays;
    }
    bossPhoneFilePath = path_1.default.join(process.cwd(), 'whatsapp_boss_phone.json');
    getBossPhoneNumber() {
        try {
            if (fs_1.default.existsSync(this.bossPhoneFilePath)) {
                const raw = fs_1.default.readFileSync(this.bossPhoneFilePath, 'utf8');
                const data = JSON.parse(raw);
                if (data.bossPhone && typeof data.bossPhone === 'string' && data.bossPhone.trim()) {
                    return data.bossPhone.trim();
                }
            }
        }
        catch (e) {
            // fallback
        }
        return '+237676761349';
    }
    async setBossPhoneNumber(phone) {
        const cleanPhone = phone.trim();
        try {
            fs_1.default.writeFileSync(this.bossPhoneFilePath, JSON.stringify({ bossPhone: cleanPhone, updatedAt: new Date().toISOString() }), 'utf8');
        }
        catch (e) {
            logger_1.logger.warn('[WhatsApp Service] Could not write boss phone file', { error: e?.message });
        }
        try {
            const managerUser = await database_1.default.user.findFirst({
                where: { role: { name: 'MANAGER' } },
                include: { staffProfile: true },
            });
            if (managerUser?.staffProfile) {
                await database_1.default.staffProfile.update({
                    where: { id: managerUser.staffProfile.id },
                    data: { phone: cleanPhone },
                });
            }
        }
        catch (e) {
            logger_1.logger.warn('[WhatsApp Service] Note: Could not sync boss phone to manager profile in DB:', e?.message || e);
        }
        return cleanPhone;
    }
    /**
     * Retry message (supports FAILED and QUEUED)
     * Intelligently reconstructs Meta template metadata based on automationType
     * to strictly prevent Meta Error 131047 (sending free-form text outside 24h window).
     */
    async retryFailedMessage(logId) {
        const existing = await database_1.default.whatsAppMessageLog.findUnique({
            where: { id: logId },
            include: {
                client: true,
                appointment: {
                    include: {
                        mainTechnician: { include: { staffProfile: true } },
                    },
                },
                invoice: true,
            },
        });
        if (!existing) {
            throw new errorHandler_1.AppError('WhatsApp message log not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const log = existing;
        let templateName = undefined;
        let templateLanguage = 'en';
        let templateVariables = undefined;
        const clientName = log.client?.name?.trim() || 'Valued Guest';
        switch (log.automationType) {
            case whatsapp_types_1.WhatsAppAutomationType.CLIENT_WELCOME: {
                templateName = 'client_welcome';
                templateLanguage = 'en';
                templateVariables = [clientName];
                break;
            }
            case whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_REMINDER:
            case whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_24H: {
                templateName = 'appointment_reminder';
                templateLanguage = 'en';
                const dateStr = log.appointment?.appointmentDate
                    ? new Date(log.appointment.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'upcoming';
                const timeStr = log.appointment?.appointmentTime || '14:00';
                const serviceName = log.appointment?.serviceSummary || 'Spa Service';
                const techName = log.appointment?.mainTechnician?.staffProfile?.name || 'our specialist';
                templateVariables = [clientName, `${dateStr} at ${timeStr}`, serviceName, techName];
                break;
            }
            case whatsapp_types_1.WhatsAppAutomationType.APPOINTMENT_2H: {
                templateName = 'appointment_reminder_2h';
                templateLanguage = 'en';
                const timeStr = log.appointment?.appointmentTime || '10:00';
                const serviceName = log.appointment?.serviceSummary || 'Spa Service';
                const techName = log.appointment?.mainTechnician?.staffProfile?.name || 'our specialist';
                templateVariables = [clientName, timeStr, serviceName, techName];
                break;
            }
            case whatsapp_types_1.WhatsAppAutomationType.PAYMENT_CONFIRMATION: {
                templateName = 'payment_confirmation_';
                templateLanguage = 'en';
                const total = log.invoice ? Number(log.invoice.total).toLocaleString('fr-FR') : '0';
                const invoiceNum = log.invoice?.invoiceNumber || 'INV-0000';
                const paymentMethod = (log.invoice?.paymentMethod || 'CASH').replace('_', ' ');
                const loyaltyPoints = log.client?.loyaltyPoints || 0;
                templateVariables = [clientName, total, invoiceNum, paymentMethod, loyaltyPoints];
                break;
            }
            case whatsapp_types_1.WhatsAppAutomationType.AFTER_SERVICE: {
                templateName = 'service_thank_you';
                templateLanguage = 'en';
                const serviceName = log.appointment?.serviceSummary || 'Spa Treatment';
                const techName = log.appointment?.mainTechnician?.staffProfile?.name || 'your technician';
                const points = log.client?.loyaltyPoints || 0;
                templateVariables = [clientName, serviceName, techName, points];
                break;
            }
            case whatsapp_types_1.WhatsAppAutomationType.BIRTHDAY: {
                templateName = 'birthday_greeting';
                templateLanguage = 'en';
                templateVariables = [clientName, 50];
                break;
            }
            case whatsapp_types_1.WhatsAppAutomationType.ANNIVERSARY: {
                templateName = 'anniversary_greeting';
                templateLanguage = 'en';
                templateVariables = [clientName];
                break;
            }
            case whatsapp_types_1.WhatsAppAutomationType.REBOOKING: {
                templateName = 'rebooking_reminder';
                templateLanguage = 'en';
                templateVariables = [clientName, 30, 15];
                break;
            }
            case whatsapp_types_1.WhatsAppAutomationType.DAILY_CLOSE_BOSS: {
                templateName = 'daily_close_summary';
                templateLanguage = 'en';
                break;
            }
        }
        const metadata = templateName
            ? {
                template: {
                    name: templateName,
                    language: templateLanguage,
                    components: templateVariables && templateVariables.length > 0
                        ? [
                            {
                                type: 'body',
                                parameters: templateVariables.map((v) => ({
                                    type: 'text',
                                    text: String(v ?? ''),
                                })),
                            },
                        ]
                        : undefined,
                },
            }
            : undefined;
        const sendResult = await whatsapp_adapter_1.whatsappAdapter.send({
            channel: 'WHATSAPP',
            recipient: { phone: log.recipientPhone, clientId: log.clientId || undefined },
            content: log.message,
            idempotencyKey: `retry-${log.idempotencyKey}-${Date.now()}`,
            metadata,
        });
        return database_1.default.whatsAppMessageLog.update({
            where: { id: logId },
            data: {
                status: sendResult.status,
                providerMessageId: sendResult.providerMessageId || log.providerMessageId,
                failureReason: sendResult.failureReason || null,
                sentAt: sendResult.status === 'SENT' ? new Date() : null,
            },
        });
    }
    /**
     * Webhook callback handler from Meta Cloud API
     * Parses entry[].changes[].value.statuses[] structure from Meta
     * Maps Meta statuses: sent→SENT, delivered→DELIVERED, read→DELIVERED, failed→FAILED
     */
    async handleWebhook(payload) {
        // Handle simple legacy format (providerMessageId + status)
        if (payload?.providerMessageId && payload?.status) {
            const log = await database_1.default.whatsAppMessageLog.findFirst({
                where: { providerMessageId: payload.providerMessageId },
            });
            if (!log)
                return { received: true, updated: false };
            const updated = await database_1.default.whatsAppMessageLog.update({
                where: { id: log.id },
                data: {
                    status: payload.status,
                    failureReason: payload.failureReason || null,
                },
            });
            return { received: true, updated: true, logId: updated.id };
        }
        // Parse Meta Cloud API webhook payload
        const entries = payload?.entry || [];
        let updatedCount = 0;
        for (const entry of entries) {
            const changes = entry?.changes || [];
            for (const change of changes) {
                const statuses = change?.value?.statuses || [];
                for (const statusUpdate of statuses) {
                    const providerMessageId = statusUpdate?.id;
                    const metaStatus = (statusUpdate?.status || '').toLowerCase();
                    const errorInfo = statusUpdate?.errors?.[0];
                    if (!providerMessageId)
                        continue;
                    // Map Meta status to our enum
                    let mappedStatus;
                    let failureReason = null;
                    switch (metaStatus) {
                        case 'sent':
                            mappedStatus = 'SENT';
                            break;
                        case 'delivered':
                        case 'read':
                            mappedStatus = 'DELIVERED';
                            break;
                        case 'failed':
                            mappedStatus = 'FAILED';
                            failureReason = errorInfo
                                ? `Error ${errorInfo.code}: ${errorInfo.title || errorInfo.message || 'Unknown error'}`
                                : 'Delivery failed';
                            break;
                        default:
                            continue; // Skip unknown statuses
                    }
                    // Find and update the log entry
                    const log = await database_1.default.whatsAppMessageLog.findFirst({
                        where: { providerMessageId },
                    });
                    if (log) {
                        await database_1.default.whatsAppMessageLog.update({
                            where: { id: log.id },
                            data: {
                                status: mappedStatus,
                                failureReason,
                                ...(metaStatus === 'sent' ? { sentAt: new Date() } : {}),
                            },
                        });
                        updatedCount++;
                    }
                }
                // ==========================================
                // Process Inbound Customer WhatsApp Messages (AI Chatbot)
                // ==========================================
                const incomingMessages = change?.value?.messages || [];
                const contacts = change?.value?.contacts || [];
                for (const msg of incomingMessages) {
                    const contact = contacts.find((c) => c.wa_id === msg.from);
                    const senderName = contact?.profile?.name;
                    // Asynchronously trigger AI Chatbot conversation pipeline
                    chatbot_service_1.chatbotService
                        .handleIncomingMessage({
                        from: msg.from,
                        id: msg.id,
                        timestamp: msg.timestamp,
                        type: msg.type,
                        text: msg.text,
                        name: senderName,
                    })
                        .catch((err) => {
                        logger_1.logger.error('[WhatsApp Webhook] Exception running chatbot handler', {
                            messageId: msg.id,
                            from: msg.from,
                            error: err?.message,
                        });
                    });
                }
            }
        }
        return { received: true, updatedCount };
    }
}
exports.WhatsAppService = WhatsAppService;
exports.whatsappService = new WhatsAppService();
//# sourceMappingURL=whatsapp.service.js.map