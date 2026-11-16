import { WhatsAppAutomationType, UpdateAutomationInput, SendCustomMessageInput, ProcessRemindersResult, DailyCloseTriggerInput, MessageLogsQueryFilter, AuthContextUser } from './whatsapp.types';
export declare function normalizeAutomationType(input: string): WhatsAppAutomationType;
export declare class WhatsAppService {
    /**
     * Default message templates for all 8 automations.
     */
    private readonly defaultTemplates;
    private hasSeeded;
    /**
     * Automatically ensure default templates are seeded in database if table is empty.
     */
    ensureSeededAutomations(): Promise<void>;
    /**
     * Get all automation configurations (strictly the 9 active canonical types).
     */
    getAutomations(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.WhatsAppAutomationType;
        template: string;
        timing: string | null;
    }[]>;
    /**
     * Get single automation configuration.
     */
    getAutomationByType(type: WhatsAppAutomationType): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.WhatsAppAutomationType;
        template: string;
        timing: string | null;
    }>;
    /**
     * Update automation configuration (Manager only).
     * Direct upsert executes in a single database round-trip (~100-200ms).
     */
    updateAutomation(type: WhatsAppAutomationType, input: UpdateAutomationInput): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.WhatsAppAutomationType;
        template: string;
        timing: string | null;
    }>;
    /**
     * Compiles template string by substituting placeholders with real data.
     */
    compileTemplate(template: string, placeholders: Record<string, string | number>): string;
    /**
     * Core dispatch logic with strict idempotency check and audit logging.
     */
    dispatchMessage(params: {
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
        skipActiveCheck?: boolean;
    }): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    }>;
    /**
     * 1. Birthday greeting trigger
     */
    triggerBirthday(clientId: string, year?: number): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    }>;
    /**
     * 2. Anniversary greeting trigger
     */
    triggerAnniversary(clientId: string, year?: number): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    }>;
    /**
     * Process Celebration Greetings (Birthday & Anniversary)
     */
    processCelebrationReminders(): Promise<{
        processedClients: number;
        birthdaysSent: number;
        anniversariesSent: number;
        skippedCount: number;
    }>;
    /**
     * 3. Database-driven Scheduled Appointment Reminder Processor (24h and 2h)
     * Uses NotificationEventBuilder to query and assemble reminder events channel-independently.
     */
    processScheduledReminders(): Promise<ProcessRemindersResult>;
    /**
     * 4. After-Service Thank You Trigger
     */
    triggerAfterService(appointmentId: string): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    }>;
    /**
     * 5. Payment Confirmation Trigger
     */
    triggerPaymentConfirmation(invoiceId: string): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    }>;
    /**
     * Check if a receipt was already sent for this invoice
     */
    getInvoiceReceiptStatus(invoiceId: string): Promise<{
        alreadySent: boolean;
        lastSentAt: Date | null;
        recipientPhone: string | null;
        messageId: string | null;
    }>;
    /**
     * Send official Invoice PDF as an attached document via WhatsApp Cloud API
     */
    sendInvoicePdf(invoiceId: string, recipientPhoneOverride?: string): Promise<{
        success: boolean;
        status: import("../notifications").NotificationDeliveryStatus;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
        filename: string;
    }>;
    /**
     * Dispatch feedback request with rating link immediately when payment is collected
     */
    sendInvoiceFeedback(invoiceId: string, recipientPhoneOverride?: string): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    }>;
    /**
     * 6. Rebooking Reminder Trigger with Anti-Spam Guards
     */
    triggerRebooking(clientId: string, businessDate?: string): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    } | {
        alreadySent: boolean;
        skipped: boolean;
        reason: string;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    } | {
        alreadySent: boolean;
        skipped: boolean;
        reason: any;
        log: {
            status: any;
        };
    }>;
    /**
     * Process Rebooking Reminders Batch
     * Strictly targets clients with completed visits >= 30 days ago, NO recent visits, NO recent invoices, and NO upcoming bookings.
     */
    processRebookingReminders(clientId?: string): Promise<{
        processedCount: number;
        sentCount: number;
        skippedCount: number;
        details: ({
            alreadySent: boolean;
            log: {
                message: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
                clientId: string | null;
                appointmentId: string | null;
                failureReason: string | null;
                providerMessageId: string | null;
                sentAt: Date | null;
                idempotencyKey: string;
                invoiceId: string | null;
                recipientPhone: string;
                automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
                scheduledFor: Date | null;
            };
        } | {
            alreadySent: boolean;
            skipped: boolean;
            reason: string;
            log: {
                message: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
                clientId: string | null;
                appointmentId: string | null;
                failureReason: string | null;
                providerMessageId: string | null;
                sentAt: Date | null;
                idempotencyKey: string;
                invoiceId: string | null;
                recipientPhone: string;
                automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
                scheduledFor: Date | null;
            };
        } | {
            alreadySent: boolean;
            skipped: boolean;
            reason: any;
            log: {
                status: any;
            };
        })[];
    } | {
        processedCount: number;
        sentCount: number;
        skippedCount: number;
        details?: undefined;
    }>;
    /**
     * 7. Daily Close Summary to Manager / Boss
     */
    triggerDailyCloseBoss(input: DailyCloseTriggerInput, authUser: AuthContextUser): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    }>;
    /**
     * 8. Instant Appointment Confirmation — triggered immediately when appointment is created.
     * Uses the Meta-approved 'appointment_reminder' template to send confirmation.
     */
    triggerAppointmentConfirmation(appointmentId: string): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    } | {
        alreadySent: boolean;
        log: null;
        error: string;
    }>;
    /**
     * 8b. Staff Appointment Alert — triggered when appointment is booked.
     * Sends instant notification to the assigned Barber / Technician via WhatsApp.
     */
    triggerStaffAppointmentAlert(appointmentId: string): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    } | {
        alreadySent: boolean;
        log: null;
        error: string;
    }>;
    /**
     * 9. Instant New Client Welcome — triggered automatically when a new client is added to the system.
     */
    triggerClientWelcome(clientId: string): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    } | {
        alreadySent: boolean;
        log: null;
        error: string;
    }>;
    /**
     * 10. Custom / Direct templated dispatch
     */
    sendCustomMessage(input: SendCustomMessageInput): Promise<{
        alreadySent: boolean;
        log: {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        };
    }>;
    /**
     * Message Logs query with filters and pagination
     */
    getMessageLogs(query: MessageLogsQueryFilter): Promise<{
        logs: ({
            client: {
                id: string;
                phone: string;
                name: string;
            } | null;
            appointment: {
                id: string;
                appointmentDate: Date;
                appointmentTime: string;
                serviceSummary: string | null;
            } | null;
            invoice: {
                id: string;
                total: import("@prisma/client/runtime/library").Decimal;
                invoiceNumber: string;
            } | null;
        } & {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
            clientId: string | null;
            appointmentId: string | null;
            failureReason: string | null;
            providerMessageId: string | null;
            sentAt: Date | null;
            idempotencyKey: string;
            invoiceId: string | null;
            recipientPhone: string;
            automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
            scheduledFor: Date | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Purge old WhatsApp message logs
     * @param daysThreshold Number of days (default 30)
     */
    purgeOldMessageLogs(daysThreshold?: number): Promise<{
        deletedCount: number;
        cutoffDate: Date;
    }>;
    private retentionFilePath;
    getRetentionDays(): number;
    setRetentionDays(days: number): number;
    private bossPhoneFilePath;
    getBossPhoneNumber(): string;
    setBossPhoneNumber(phone: string): Promise<string>;
    /**
     * Retry message (supports FAILED and QUEUED)
     * Intelligently reconstructs Meta template metadata based on automationType
     * to strictly prevent Meta Error 131047 (sending free-form text outside 24h window).
     */
    retryFailedMessage(logId: string): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.WhatsAppMessageStatus;
        clientId: string | null;
        appointmentId: string | null;
        failureReason: string | null;
        providerMessageId: string | null;
        sentAt: Date | null;
        idempotencyKey: string;
        invoiceId: string | null;
        recipientPhone: string;
        automationType: import(".prisma/client").$Enums.WhatsAppAutomationType | null;
        scheduledFor: Date | null;
    }>;
    /**
     * Webhook callback handler from Meta Cloud API
     * Parses entry[].changes[].value.statuses[] structure from Meta
     * Maps Meta statuses: sent→SENT, delivered→DELIVERED, read→DELIVERED, failed→FAILED
     */
    handleWebhook(payload: any): Promise<{
        received: boolean;
        updated: boolean;
        logId?: undefined;
        updatedCount?: undefined;
    } | {
        received: boolean;
        updated: boolean;
        logId: string;
        updatedCount?: undefined;
    } | {
        received: boolean;
        updatedCount: number;
        updated?: undefined;
        logId?: undefined;
    }>;
}
export declare const whatsappService: WhatsAppService;
//# sourceMappingURL=whatsapp.service.d.ts.map