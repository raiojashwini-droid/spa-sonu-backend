import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  NotificationDeliveryResult,
} from '../notification.types';

/**
 * Future Email Provider Adapter Skeleton
 * Plugs directly into the generic INotificationProvider contract without duplicating business trigger logic.
 * Not active; credentials not configured.
 */
export class EmailProviderAdapter implements INotificationProvider {
  readonly channel: NotificationChannel = 'EMAIL';
  readonly providerName: string;
  private readonly apiKey?: string;

  constructor() {
    this.providerName = process.env.EMAIL_PROVIDER || 'MOCK_EMAIL_ADAPTER';
    this.apiKey = process.env.EMAIL_API_KEY;
  }

  getHealthStatus(): { isConfigured: boolean; providerName: string; channel: NotificationChannel } {
    return {
      isConfigured: Boolean(this.apiKey && this.apiKey.trim().length > 0),
      providerName: this.providerName,
      channel: this.channel,
    };
  }

  async send(payload: NotificationPayload): Promise<NotificationDeliveryResult> {
    if (!payload.recipient.email) {
      return {
        success: false,
        status: 'FAILED',
        failureReason: 'Missing recipient email address',
      };
    }

    if (!this.apiKey) {
      return {
        success: true,
        status: 'QUEUED',
        providerMessageId: `email-queued-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        failureReason: 'Email provider credentials not configured; message kept in QUEUED state',
      };
    }

    return {
      success: true,
      status: 'SENT',
      providerMessageId: `email-${Date.now()}`,
      sentAt: new Date(),
    };
  }
}

export const emailProvider = new EmailProviderAdapter();
