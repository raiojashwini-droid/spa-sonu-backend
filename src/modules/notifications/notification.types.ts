export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';

export type NotificationDeliveryStatus = 'QUEUED' | 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SKIPPED';

export interface NotificationRecipient {
  clientId?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface NotificationPayload {
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  content: string;
  subject?: string; // For Email
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface NotificationDeliveryResult {
  success: boolean;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  failureReason?: string;
  sentAt?: Date | null;
}

/**
 * Generic Notification Provider Interface
 * All delivery adapters (WhatsApp, future SMS, future Email) implement this contract.
 */
export interface INotificationProvider {
  readonly channel: NotificationChannel;
  readonly providerName: string;
  send(payload: NotificationPayload): Promise<NotificationDeliveryResult>;
  getHealthStatus(): { isConfigured: boolean; providerName: string; channel: NotificationChannel };
}

export interface NotificationEventData<T = Record<string, string | number>> {
  eventType: string;
  idempotencyKey: string;
  recipient: NotificationRecipient;
  placeholders: T;
  clientId?: string;
  appointmentId?: string;
  invoiceId?: string;
}
