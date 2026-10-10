import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  NotificationDeliveryResult,
} from '../notification.types';

/**
 * Future SMS Provider Adapter Skeleton
 * Plugs directly into the generic INotificationProvider contract without duplicating business trigger logic.
 * Not active; credentials not configured.
 */
export class SmsProviderAdapter implements INotificationProvider {
  readonly channel: NotificationChannel = 'SMS';
  readonly providerName: string;
  private readonly apiKey?: string;

  constructor() {
    this.providerName = process.env.SMS_PROVIDER || 'MOCK_SMS_ADAPTER';
    this.apiKey = process.env.SMS_API_KEY;
  }

  getHealthStatus(): { isConfigured: boolean; providerName: string; channel: NotificationChannel } {
    return {
      isConfigured: Boolean(this.apiKey && this.apiKey.trim().length > 0),
      providerName: this.providerName,
      channel: this.channel,
    };
  }

  async send(payload: NotificationPayload): Promise<NotificationDeliveryResult> {
    if (!payload.recipient.phone) {
      return {
        success: false,
        status: 'FAILED',
        failureReason: 'Missing recipient phone number for SMS',
      };
    }

    if (!this.apiKey) {
      return {
        success: true,
        status: 'QUEUED',
        providerMessageId: `sms-queued-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        failureReason: 'SMS provider credentials not configured; message kept in QUEUED state',
      };
    }

    return {
      success: true,
      status: 'SENT',
      providerMessageId: `sms-${Date.now()}`,
      sentAt: new Date(),
    };
  }
}

export const smsProvider = new SmsProviderAdapter();
