import { INotificationProvider, NotificationChannel, NotificationPayload, NotificationDeliveryResult } from '../notification.types';
/**
 * Future SMS Provider Adapter Skeleton
 * Plugs directly into the generic INotificationProvider contract without duplicating business trigger logic.
 * Not active; credentials not configured.
 */
export declare class SmsProviderAdapter implements INotificationProvider {
    readonly channel: NotificationChannel;
    readonly providerName: string;
    private readonly apiKey?;
    constructor();
    getHealthStatus(): {
        isConfigured: boolean;
        providerName: string;
        channel: NotificationChannel;
    };
    send(payload: NotificationPayload): Promise<NotificationDeliveryResult>;
}
export declare const smsProvider: SmsProviderAdapter;
//# sourceMappingURL=sms.provider.d.ts.map