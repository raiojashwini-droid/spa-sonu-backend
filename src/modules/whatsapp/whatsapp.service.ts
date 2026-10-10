import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import {
  WhatsAppAutomationType,
  WhatsAppMessageStatus,
  UpdateAutomationInput,
  SendCustomMessageInput,
  ProcessRemindersResult,
  DailyCloseTriggerInput,
  MessageLogsQueryFilter,
  AuthContextUser,
} from './whatsapp.types';
import { whatsappAdapter } from './whatsapp.adapter';
import { notificationEventBuilder } from '../notifications/notification-event.builder';
import { invoicePdfService } from '../invoices/invoice-pdf.service';
import { logger } from '../../utils/logger';

export function normalizeAutomationType(input: string): WhatsAppAutomationType {
  const up = (input || '').toUpperCase().replace(/-/g, '_');
  if (up === 'BIRTHDAY_GREETING' || up === 'BIRTHDAY') return WhatsAppAutomationType.BIRTHDAY;
  if (up === 'ANNIVERSARY_GREETING' || up === 'ANNIVERSARY') return WhatsAppAutomationType.ANNIVERSARY;
  if (up === 'DAILY_CLOSE_SUMMARY' || up === 'DAILY_CLOSE_BOSS' || up === 'DAILY_CLOSE') return WhatsAppAutomationType.DAILY_CLOSE_BOSS;
  if (up === 'REBOOKING_REMINDER' || up === 'REBOOKING') return WhatsAppAutomationType.REBOOKING;
  if (up === 'APPOINTMENT_REMINDER_24H' || up === 'APPOINTMENT_24H') return WhatsAppAutomationType.APPOINTMENT_24H;
  if (up === 'APPOINTMENT_REMINDER_2H' || up === 'APPOINTMENT_2H') return WhatsAppAutomationType.APPOINTMENT_2H;
  if (up === 'AFTER_SERVICE_THANK_YOU' || up === 'AFTER_SERVICE') return WhatsAppAutomationType.AFTER_SERVICE;
  if (up === 'INVOICE_CONFIRMATION' || up === 'PAYMENT_CONFIRMATION') return WhatsAppAutomationType.PAYMENT_CONFIRMATION;
  return up as WhatsAppAutomationType;
}

export class WhatsAppService {
  /**
   * Default message templates for all 8 automations.
   */
  private readonly defaultTemplates: Record<WhatsAppAutomationType, { template: string; timing: string }> = {
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
      template:
        'Thank you {clientName} for visiting OMEGA SPA! 🌿 We hope you enjoyed your {service} with {technician}. Your current loyalty points balance: {loyaltyPoints} points.\n\n⭐ We value your feedback! Rate your experience here:\n{feedbackLink}\n\n— OMEGA SPA, Douala',
      timing: 'immediate',
    },
    PAYMENT_CONFIRMATION: {
      template:
        '🧾 *OMEGA SPA — Reçu / Receipt*\nFacture: {invoiceNumber}\nClient: {clientName}\n\n*Prestations / Services:*\n{itemsList}\n\n*Total Payé / Paid:* {amount} FCFA ({paymentMethod})\n*Points Fidélité / Loyalty:* {loyaltyPoints} pts\n\nMerci pour votre visite chez OMEGA SPA ! 🌿\nDouala, Cameroun · Tél: +237 6 87 67 32 62',
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
    APPOINTMENT_REMINDER: {
      template: 'Hello {clientName}, your appointment at OMEGA SPA is confirmed for {appointmentDate} at {appointmentTime}.',
      timing: '24h',
    },
    INVOICE_THANKYOU: {
      template: 'Thank you {clientName} for your payment of {amount} FCFA for Invoice {invoiceNumber}.',
      timing: 'immediate',
    },
    DAILY_SUMMARY: {
      template: 'OMEGA SPA Daily Summary ({todayDate}): Total Revenue: {totalRevenue} FCFA.',
      timing: '19:30',
    },
  };

  /**
   * Automatically ensure default templates are seeded in database if table is empty.
   */
  async ensureSeededAutomations() {
    for (const [type, data] of Object.entries(this.defaultTemplates)) {
      const autoType = type as WhatsAppAutomationType;
      await prisma.whatsAppAutomation.upsert({
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
   * Get all automation configurations.
   */
  async getAutomations() {
    await this.ensureSeededAutomations();
    return prisma.whatsAppAutomation.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get single automation configuration.
   */
  async getAutomationByType(type: WhatsAppAutomationType) {
    await this.ensureSeededAutomations();
    const item = await prisma.whatsAppAutomation.findUnique({
      where: { type },
    });
    if (!item) {
      throw new AppError(`Automation setting for ${type} not found`, HTTP_STATUS.NOT_FOUND);
    }
    return item;
  }

  /**
   * Update automation configuration (Manager only).
   */
  async updateAutomation(type: WhatsAppAutomationType, input: UpdateAutomationInput) {
    await this.ensureSeededAutomations();
    const existing = await prisma.whatsAppAutomation.findUnique({ where: { type } });
    if (!existing) {
      throw new AppError(`Automation setting for ${type} not found`, HTTP_STATUS.NOT_FOUND);
    }

    const activeFlag = input.isActive !== undefined ? input.isActive : input.enabled;
    const timeVal = input.timing !== undefined ? input.timing : input.scheduleTime;

    return prisma.whatsAppAutomation.update({
      where: { type },
      data: {
        template: input.template !== undefined ? input.template.trim() : undefined,
        isActive: activeFlag !== undefined ? activeFlag : undefined,
        timing: timeVal !== undefined ? (timeVal ? timeVal.trim() : null) : undefined,
      },
    });
  }

  /**
   * Compiles template string by substituting placeholders with real data.
   */
  compileTemplate(template: string, placeholders: Record<string, string | number>): string {
    return notificationEventBuilder.compileTemplate(template, placeholders);
  }

  /**
   * Core dispatch logic with strict idempotency check and audit logging.
   */
  async dispatchMessage(params: {
    recipientPhone: string;
    message: string;
    idempotencyKey: string;
    automationType?: WhatsAppAutomationType;
    clientId?: string;
    appointmentId?: string;
    invoiceId?: string;
    templateName?: string;
    templateVariables?: (string | number)[];
    templateLanguage?: string;
  }) {
    const {
      recipientPhone,
      message,
      idempotencyKey,
      automationType,
      clientId,
      appointmentId,
      invoiceId,
      templateName,
      templateVariables,
      templateLanguage,
    } = params;

    // 1. Strict Idempotency Check: Verify if message already logged with this key
    const existingLog = await prisma.whatsAppMessageLog.findUnique({
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
      const existingByAppt = await prisma.whatsAppMessageLog.findFirst({
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

    // 2. Check if automation is active
    if (automationType) {
      const setting = await prisma.whatsAppAutomation.findUnique({
        where: { type: automationType },
      });
      if (setting && !setting.isActive) {
        const skippedLog = await prisma.whatsAppMessageLog.create({
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
    let metadata: any = undefined;
    if (templateName) {
      const resolvedLanguage =
        templateLanguage ||
        ([
          'appointment_reminder',
          'payment_confirmation_',
          'service_thank_you',
          'birthday_greeting',
          'anniversary_greeting',
          'rebooking_reminder',
        ].includes(templateName)
          ? 'en'
          : 'en_US');

      metadata = {
        template: {
          name: templateName,
          language: resolvedLanguage,
          components:
            templateVariables && templateVariables.length > 0
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
    const sendResult = await whatsappAdapter.send({
      channel: 'WHATSAPP',
      recipient: { phone: recipientPhone, clientId },
      content: message,
      idempotencyKey,
      metadata,
    });

    // 4. Record in WhatsAppMessageLog
    const now = new Date();
    const createdLog = await prisma.whatsAppMessageLog.create({
      data: {
        clientId,
        invoiceId,
        appointmentId,
        automationType,
        recipientPhone,
        message,
        providerMessageId: sendResult.providerMessageId || null,
        status: sendResult.status as any,
        failureReason: sendResult.failureReason || null,
        idempotencyKey,
        sentAt: sendResult.status === 'SENT' ? now : null,
      },
    });

    // 5. Log to ClientHistory if client is associated
    if (clientId) {
      await prisma.clientHistory.create({
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
  async triggerBirthday(clientId: string, year: number = new Date().getFullYear()) {
    const event = await notificationEventBuilder.buildBirthdayEvent(clientId, year);
    const setting = await this.getAutomationByType(WhatsAppAutomationType.BIRTHDAY);
    const message = this.compileTemplate(setting.template, event.placeholders);

    return this.dispatchMessage({
      recipientPhone: event.recipient.phone || '',
      message,
      idempotencyKey: event.idempotencyKey,
      automationType: WhatsAppAutomationType.BIRTHDAY,
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
  async triggerAnniversary(clientId: string, year: number = new Date().getFullYear()) {
    const event = await notificationEventBuilder.buildAnniversaryEvent(clientId, year);
    const setting = await this.getAutomationByType(WhatsAppAutomationType.ANNIVERSARY);
    const message = this.compileTemplate(setting.template, event.placeholders);

    return this.dispatchMessage({
      recipientPhone: event.recipient.phone || '',
      message,
      idempotencyKey: event.idempotencyKey,
      automationType: WhatsAppAutomationType.ANNIVERSARY,
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

    const clients = await prisma.client.findMany({
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
          if (!res.alreadySent && res.log.status !== 'SKIPPED') birthdaysSent++;
          else skippedCount++;
        }
      }

      if (client.anniversary) {
        const anniDate = new Date(client.anniversary);
        const anniMMDD = `${String(anniDate.getUTCMonth() + 1).padStart(2, '0')}-${String(anniDate.getUTCDate()).padStart(2, '0')}`;
        if (anniMMDD === todayMMDD) {
          const res = await this.triggerAnniversary(client.id, currentYear);
          if (!res.alreadySent && res.log.status !== 'SKIPPED') anniversariesSent++;
          else skippedCount++;
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
  async processScheduledReminders(): Promise<ProcessRemindersResult> {
    await this.ensureSeededAutomations();

    const { reminders24h, reminders2h, totalScheduled } = await notificationEventBuilder.buildScheduledReminderEvents();
    const setting24h = await this.getAutomationByType(WhatsAppAutomationType.APPOINTMENT_24H);
    const setting2h = await this.getAutomationByType(WhatsAppAutomationType.APPOINTMENT_2H);

    let reminders24hSent = 0;
    let reminders2hSent = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process 24h reminders
    for (const item of reminders24h) {
      const existing24h = await prisma.whatsAppMessageLog.findUnique({ where: { idempotencyKey: item.idempotencyKey } });
      if (!existing24h && setting24h.isActive) {
        const msg24h = this.compileTemplate(setting24h.template, item.placeholders);
        const res24h = await this.dispatchMessage({
          recipientPhone: item.recipient.phone || '',
          message: msg24h,
          idempotencyKey: item.idempotencyKey,
          automationType: WhatsAppAutomationType.APPOINTMENT_24H,
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
        } else {
          skippedCount++;
        }
      }
    }

    // Process 2h reminders
    for (const item of reminders2h) {
      const existing2h = await prisma.whatsAppMessageLog.findUnique({ where: { idempotencyKey: item.idempotencyKey } });
      if (!existing2h && setting2h.isActive) {
        const msg2h = this.compileTemplate(setting2h.template, item.placeholders);
        const res2h = await this.dispatchMessage({
          recipientPhone: item.recipient.phone || '',
          message: msg2h,
          idempotencyKey: item.idempotencyKey,
          automationType: WhatsAppAutomationType.APPOINTMENT_2H,
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
        } else {
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
  async triggerAfterService(appointmentId: string) {
    const event = await notificationEventBuilder.buildAfterServiceEvent(appointmentId);
    const setting = await this.getAutomationByType(WhatsAppAutomationType.AFTER_SERVICE);
    const message = this.compileTemplate(setting.template, event.placeholders);

    const idempotencyKey = `after-service:${appointmentId}`;

    return this.dispatchMessage({
      recipientPhone: event.recipient.phone || '',
      message,
      idempotencyKey,
      automationType: WhatsAppAutomationType.AFTER_SERVICE,
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
  async triggerPaymentConfirmation(invoiceId: string) {
    const event = await notificationEventBuilder.buildPaymentConfirmationEvent(invoiceId);
    const setting = await this.getAutomationByType(WhatsAppAutomationType.PAYMENT_CONFIRMATION);
    const message = this.compileTemplate(setting.template, event.placeholders);

    return this.dispatchMessage({
      recipientPhone: event.recipient.phone || '',
      message,
      idempotencyKey: event.idempotencyKey,
      automationType: WhatsAppAutomationType.PAYMENT_CONFIRMATION,
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
  }

  /**
   * Check if a receipt was already sent for this invoice
   */
  async getInvoiceReceiptStatus(invoiceId: string) {
    const existingLog = await prisma.whatsAppMessageLog.findFirst({
      where: {
        invoiceId,
        automationType: WhatsAppAutomationType.PAYMENT_CONFIRMATION,
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
  async sendInvoicePdf(invoiceId: string, recipientPhoneOverride?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          include: { loyalty: true },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!invoice) throw new AppError('Invoice not found', HTTP_STATUS.NOT_FOUND);

    const phone = recipientPhoneOverride || invoice.client?.phone || invoice.client?.whatsapp;
    if (!phone) throw new AppError('Client has no phone number on file', HTTP_STATUS.BAD_REQUEST);

    // 1. Generate PDF buffer
    const { buffer, filename } = await invoicePdfService.generateInvoicePdf(invoiceId);

    // Look up feedback token if available
    let feedbackToken: string | null = null;
    if (invoice.appointmentId) {
      const fb = await prisma.clientFeedback.findFirst({ where: { appointmentId: invoice.appointmentId } });
      feedbackToken = fb?.token || null;
    }
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://omega-spa-pos.netlify.app';
    const feedbackText = feedbackToken ? `\n\n⭐ Votre avis compte pour nous / Rate your experience:\n${frontendBaseUrl}/feedback?token=${feedbackToken}` : '';

    const caption = `🧾 *Reçu Officiel OMEGA SPA* — Facture ${invoice.invoiceNumber || invoice.id.slice(0, 8)}\nTotal: ${Number(invoice.total).toLocaleString()} FCFA${feedbackText}\n\nMerci pour votre visite ! 🌿`;

    // 2. Dispatch document via Meta API (tries invoice_pdf_receipt template first)
    const result = await whatsappAdapter.sendDocument({
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
    const log = await prisma.whatsAppMessageLog.create({
      data: {
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        automationType: WhatsAppAutomationType.PAYMENT_CONFIRMATION,
        recipientPhone: phone,
        message: `[PDF Attachment] ${filename} - ${caption}`,
        providerMessageId: result.providerMessageId || null,
        status: result.status as any,
        failureReason: result.failureReason || null,
        idempotencyKey: `invoice-pdf:${invoice.id}:${Date.now()}`,
        sentAt: result.status === 'SENT' ? now : null,
      },
    });

    if (invoice.clientId) {
      await prisma.clientHistory.create({
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
   * 6. Rebooking Reminder Trigger
   */
  async triggerRebooking(clientId: string, businessDate: string = new Date().toISOString().split('T')[0]) {
    const event = await notificationEventBuilder.buildRebookingEvent(clientId, businessDate);
    const setting = await this.getAutomationByType(WhatsAppAutomationType.REBOOKING);
    const message = this.compileTemplate(setting.template, event.placeholders);

    return this.dispatchMessage({
      recipientPhone: event.recipient.phone || '',
      message,
      idempotencyKey: event.idempotencyKey,
      automationType: WhatsAppAutomationType.REBOOKING,
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
   */
  async processRebookingReminders(clientId?: string) {
    await this.ensureSeededAutomations();
    const todayStr = new Date().toISOString().split('T')[0];

    if (clientId) {
      const res = await this.triggerRebooking(clientId, todayStr);
      return {
        processedCount: 1,
        sentCount: !res.alreadySent && res.log.status !== 'SKIPPED' ? 1 : 0,
        skippedCount: res.alreadySent || res.log.status === 'SKIPPED' ? 1 : 0,
        details: [res],
      };
    }

    const fourMonthsAgo = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    const inactiveClients = await prisma.client.findMany({
      where: {
        isActive: true,
        OR: [
          { lastVisitAt: { lte: fourMonthsAgo } },
          { lastVisitAt: null },
        ],
      },
      take: 50,
    });

    let sentCount = 0;
    let skippedCount = 0;

    for (const client of inactiveClients) {
      const res = await this.triggerRebooking(client.id, todayStr);
      if (!res.alreadySent && res.log.status !== 'SKIPPED') {
        sentCount++;
      } else {
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
  async triggerDailyCloseBoss(input: DailyCloseTriggerInput, authUser: AuthContextUser) {
    const now = new Date();
    const businessDate = input.businessDate || input.date || now.toISOString().split('T')[0];
    const event = await notificationEventBuilder.buildDailyCloseEvent(businessDate, authUser.id, input.recipientPhone);

    const setting = await this.getAutomationByType(WhatsAppAutomationType.DAILY_CLOSE_BOSS);
    const message = this.compileTemplate(setting.template, event.placeholders);

    return this.dispatchMessage({
      recipientPhone: event.recipient.phone || '',
      message,
      idempotencyKey: event.idempotencyKey,
      automationType: WhatsAppAutomationType.DAILY_CLOSE_BOSS,
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
  async triggerAppointmentConfirmation(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
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

    return this.dispatchMessage({
      recipientPhone: phone,
      message: `Hello ${client.name}, your appointment at OMEGA SPA is confirmed for ${appointmentDate} at ${appointmentTime} for ${serviceNames} with ${technicianName}. See you soon!`,
      idempotencyKey,
      automationType: WhatsAppAutomationType.APPOINTMENT_REMINDER,
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

  /**
   * 8b. Staff Appointment Alert — triggered when appointment is booked.
   * Sends instant notification to the assigned Barber / Technician via WhatsApp.
   */
  async triggerStaffAppointmentAlert(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
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
      logger.info(`[Appointments] Staff appointment alert skipped: technician "${staffProfile?.name || technician.email}" has no phone number`);
      return { alreadySent: false, log: null, error: 'Staff has no phone number configured' };
    }

    const technicianName = staffProfile?.name || technician.email || 'Specialist';
    const clientName = appointment.client?.name || 'Client';

    const serviceNames =
      appointment.appointmentServices
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
      automationType: WhatsAppAutomationType.APPOINTMENT_REMINDER,
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
   * 9. Custom / Direct templated dispatch
   */
  async sendCustomMessage(input: SendCustomMessageInput) {
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
  async getMessageLogs(query: MessageLogsQueryFilter) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 20), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.automationType) where.automationType = query.automationType;
    if (query.clientId) where.clientId = query.clientId;
    if (query.appointmentId) where.appointmentId = query.appointmentId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.phone) where.recipientPhone = { contains: query.phone.trim() };

    const [total, logs] = await Promise.all([
      prisma.whatsAppMessageLog.count({ where }),
      prisma.whatsAppMessageLog.findMany({
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
   * Retry message (supports FAILED and QUEUED)
   */
  async retryFailedMessage(logId: string) {
    const existing = await prisma.whatsAppMessageLog.findUnique({
      where: { id: logId },
    });

    if (!existing) {
      throw new AppError('WhatsApp message log not found', HTTP_STATUS.NOT_FOUND);
    }

    const sendResult = await whatsappAdapter.send({
      channel: 'WHATSAPP',
      recipient: { phone: existing.recipientPhone },
      content: existing.message,
      idempotencyKey: `retry-${existing.idempotencyKey}-${Date.now()}`,
    });

    return prisma.whatsAppMessageLog.update({
      where: { id: logId },
      data: {
        status: sendResult.status as any,
        providerMessageId: sendResult.providerMessageId || existing.providerMessageId,
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
  async handleWebhook(payload: any) {
    // Handle simple legacy format (providerMessageId + status)
    if (payload?.providerMessageId && payload?.status) {
      const log = await prisma.whatsAppMessageLog.findFirst({
        where: { providerMessageId: payload.providerMessageId },
      });
      if (!log) return { received: true, updated: false };

      const updated = await prisma.whatsAppMessageLog.update({
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

          if (!providerMessageId) continue;

          // Map Meta status to our enum
          let mappedStatus: WhatsAppMessageStatus;
          let failureReason: string | null = null;

          switch (metaStatus) {
            case 'sent':
              mappedStatus = 'SENT' as WhatsAppMessageStatus;
              break;
            case 'delivered':
            case 'read':
              mappedStatus = 'DELIVERED' as WhatsAppMessageStatus;
              break;
            case 'failed':
              mappedStatus = 'FAILED' as WhatsAppMessageStatus;
              failureReason = errorInfo
                ? `Error ${errorInfo.code}: ${errorInfo.title || errorInfo.message || 'Unknown error'}`
                : 'Delivery failed';
              break;
            default:
              continue; // Skip unknown statuses
          }

          // Find and update the log entry
          const log = await prisma.whatsAppMessageLog.findFirst({
            where: { providerMessageId },
          });

          if (log) {
            await prisma.whatsAppMessageLog.update({
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
      }
    }

    return { received: true, updatedCount };
  }
}

export const whatsappService = new WhatsAppService();
