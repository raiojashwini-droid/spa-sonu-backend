import { INotificationProvider, NotificationChannel, NotificationPayload, NotificationDeliveryResult } from '../notification.types';
/**
 * Future Email Provider Adapter Skeleton
 * Plugs directly into the generic INotificationProvider contract without duplicating business trigger logic.
 * Not active; credentials not configured.
 */
export declare class EmailProviderAdapter implements INotificationProvider {
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
export declare const emailProvider: EmailProviderAdapter;
//# sourceMappingURL=email.provider.d.ts.map