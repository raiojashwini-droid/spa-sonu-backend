import { NotificationEventData } from './notification.types';
/**
 * Channel-Independent Notification Event Builder
 * Encapsulates business data querying, eligibility validation, placeholder generation,
 * and canonical idempotency key generation. Completely decoupled from WhatsApp/SMS/Email delivery channels.
 */
export declare class NotificationEventBuilder {
    /**
     * Compiles template string by substituting placeholders with real values.
     */
    compileTemplate(template: string, placeholders: Record<string, string | number>): string;
    /**
     * 1. Birthday greeting event
     */
    buildBirthdayEvent(clientId: string, year?: number): Promise<NotificationEventData>;
    /**
     * 2. Anniversary greeting event
     */
    buildAnniversaryEvent(clientId: string, year?: number): Promise<NotificationEventData>;
    /**
     * 3. Database-driven Scheduled Appointment Reminder Events
     * Filters by exact time windows:
     *  - 24h reminder: appointments between 23h and 25h from now
     *  - 2h reminder: appointments between 1.5h and 2.5h from now
     */
    buildScheduledReminderEvents(): Promise<{
        reminders24h: Array<NotificationEventData & {
            apptDate: string;
            apptTime: string;
            service: string;
            technician: string;
        }>;
        reminders2h: Array<NotificationEventData & {
            apptDate: string;
            apptTime: string;
            service: string;
            technician: string;
        }>;
        totalScheduled: number;
    }>;
    /**
     * Parse appointment date + time string into a Date object
     * Handles formats like "10:00", "10:00 AM", "14:30"
     */
    private parseAppointmentDateTime;
    /**
     * 4. After-Service Thank You Event
     */
    buildAfterServiceEvent(appointmentId: string): Promise<NotificationEventData>;
    /**
     * 5. Payment Confirmation Event
     */
    buildPaymentConfirmationEvent(invoiceId: string): Promise<NotificationEventData>;
    /**
     * 6. Rebooking Reminder Event
     * Strictly enforces minimum 30-day inactivity threshold and monthly idempotency key
     */
    buildRebookingEvent(clientId: string, businessDate?: string): Promise<NotificationEventData>;
    /**
     * 7. Daily Close Manager / Boss Event
     */
    buildDailyCloseEvent(businessDate: string, authUserId: string, recipientPhoneOverride?: string): Promise<NotificationEventData>;
}
export declare const notificationEventBuilder: NotificationEventBuilder;
//# sourceMappingURL=notification-event.builder.d.ts.map