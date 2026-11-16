"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailProvider = exports.EmailProviderAdapter = void 0;
/**
 * Future Email Provider Adapter Skeleton
 * Plugs directly into the generic INotificationProvider contract without duplicating business trigger logic.
 * Not active; credentials not configured.
 */
class EmailProviderAdapter {
    channel = 'EMAIL';
    providerName;
    apiKey;
    constructor() {
        this.providerName = process.env.EMAIL_PROVIDER || 'MOCK_EMAIL_ADAPTER';
        this.apiKey = process.env.EMAIL_API_KEY;
    }
    getHealthStatus() {
        return {
            isConfigured: Boolean(this.apiKey && this.apiKey.trim().length > 0),
            providerName: this.providerName,
            channel: this.channel,
        };
    }
    async send(payload) {
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
exports.EmailProviderAdapter = EmailProviderAdapter;
exports.emailProvider = new EmailProviderAdapter();
//# sourceMappingURL=email.provider.js.map