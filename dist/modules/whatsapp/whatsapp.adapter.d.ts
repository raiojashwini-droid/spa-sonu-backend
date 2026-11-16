import { INotificationProvider, NotificationChannel, NotificationPayload, NotificationDeliveryResult } from '../notifications/notification.types';
import { SendMessageOptions, SendMessageResult, IWhatsAppProvider } from './whatsapp.types';
/**
 * Meta WhatsApp Cloud API Provider Adapter (v20.0)
 *
 * Implements the generic INotificationProvider contract for the WHATSAPP channel.
 * Also maintains backwards-compatible IWhatsAppProvider method signatures.
 *
 * Provider Abstraction:
 * - This adapter implements two interfaces (INotificationProvider + IWhatsAppProvider).
 * - To swap to Twilio/WATI, create a new adapter implementing these same interfaces
 *   and inject it in place of this class. No automation logic changes needed.
 *
 * Supports:
 * - Text messages (direct string dispatch)
 * - Meta approved template messages with dynamic variable replacement
 * - Graceful fallback to QUEUED status when credentials not configured
 */
export declare class WhatsAppProviderAdapter implements INotificationProvider, IWhatsAppProvider {
    readonly channel: NotificationChannel;
    readonly providerName: string;
    private readonly phoneNumberId;
    private readonly accessToken;
    private readonly webhookVerifyToken;
    private readonly apiBaseUrl;
    constructor();
    /**
     * Check if the provider has valid credentials configured
     */
    isConfigured(): boolean;
    getHealthStatus(): {
        isConfigured: boolean;
        providerName: string;
        channel: NotificationChannel;
    };
    /**
     * Get the webhook verification token for Meta handshake
     */
    getWebhookVerifyToken(): string;
    /**
     * Generic INotificationProvider implementation
     * Sends text message via Meta WhatsApp Cloud API
     */
    send(payload: NotificationPayload): Promise<NotificationDeliveryResult>;
    /**
     * Send a Meta approved template message with dynamic variables
     */
    sendTemplate(params: {
        to: string;
        templateName: string;
        language?: string;
        variables?: string[];
        idempotencyKey: string;
    }): Promise<NotificationDeliveryResult>;
    /**
     * Backwards-compatible legacy method for existing WhatsApp callers
     */
    sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
    /**
     * Send a PDF document directly via Meta WhatsApp Cloud API
     * Uploads buffer to Meta Media endpoint, then delivers document message.
     */
    sendDocument(params: {
        recipientPhone: string;
        buffer: Buffer;
        filename: string;
        caption?: string;
        template?: {
            name: string;
            language?: string;
            variables?: (string | number)[];
        };
    }): Promise<NotificationDeliveryResult>;
    /**
     * Normalize phone number for Meta API
     * Strips leading '+', spaces, dashes. Ensures numeric-only format.
     * Auto-prepends Cameroon country code (237) if a 9-digit local number (6xx/2xx) is entered.
     */
    private normalizePhone;
}
export declare const whatsappAdapter: WhatsAppProviderAdapter;
//# sourceMappingURL=whatsapp.adapter.d.ts.map