import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  NotificationDeliveryResult,
} from '../notifications/notification.types';
import { SendMessageOptions, SendMessageResult, IWhatsAppProvider } from './whatsapp.types';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

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
export class WhatsAppProviderAdapter implements INotificationProvider, IWhatsAppProvider {
  readonly channel: NotificationChannel = 'WHATSAPP';
  readonly providerName: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly webhookVerifyToken: string;
  private readonly apiBaseUrl: string;

  constructor() {
    this.providerName = process.env.WHATSAPP_PROVIDER || 'META_CLOUD_API';
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = env.WHATSAPP_ACCESS_TOKEN || '';
    this.webhookVerifyToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
    this.apiBaseUrl = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Check if the provider has valid credentials configured
   */
  isConfigured(): boolean {
    return Boolean(
      this.phoneNumberId.trim().length > 0 &&
      this.accessToken.trim().length > 0
    );
  }

  getHealthStatus(): { isConfigured: boolean; providerName: string; channel: NotificationChannel } {
    return {
      isConfigured: this.isConfigured(),
      providerName: this.providerName,
      channel: this.channel,
    };
  }

  /**
   * Get the webhook verification token for Meta handshake
   */
  getWebhookVerifyToken(): string {
    return this.webhookVerifyToken;
  }

  /**
   * Generic INotificationProvider implementation
   * Sends text message via Meta WhatsApp Cloud API
   */
  async send(payload: NotificationPayload): Promise<NotificationDeliveryResult> {
    const recipientPhone = payload.recipient.phone;

    if (!recipientPhone || recipientPhone.trim().length === 0) {
      return {
        success: false,
        status: 'FAILED',
        failureReason: 'Recipient phone number is missing',
      };
    }

    // Normalize phone number: ensure it starts with country code, remove spaces/dashes
    const normalizedPhone = this.normalizePhone(recipientPhone);

    // If credentials not configured, save as QUEUED for later dispatch
    if (!this.isConfigured()) {
      logger.debug('[WhatsApp] Provider credentials not configured. Message saved as QUEUED.', {
        recipient: normalizedPhone,
      });
      return {
        success: true,
        status: 'QUEUED',
        providerMessageId: `queued-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        failureReason: 'Provider credentials not configured; message saved in QUEUED state for dispatcher',
      };
    }

    // Check if payload contains template metadata
    const templateData = payload.metadata?.template as {
      name: string;
      language?: string;
      components?: Array<{
        type: string;
        parameters: Array<{ type: string; text: string }>;
      }>;
    } | undefined;

    try {
      let metaPayload: Record<string, any>;

      if (templateData?.name) {
        // Send as Meta approved template message with dynamic variables
        metaPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'template',
          template: {
            name: templateData.name,
            language: {
              code: templateData.language || 'en',
            },
            ...(templateData.components && templateData.components.length > 0
              ? { components: templateData.components }
              : {}),
          },
        };
      } else {
        // Send as plain text message
        metaPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: payload.content,
          },
        };
      }

      logger.info('[WhatsApp] Dispatching message via Meta Cloud API', {
        to: normalizedPhone,
        type: metaPayload.type,
        templateName: templateData?.name || null,
      });

      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(metaPayload),
      });

      const responseData: any = await response.json();

      if (!response.ok) {
        // Meta API error response
        const errorMsg = responseData?.error?.message
          || responseData?.error?.error_data?.details
          || `Meta API returned HTTP ${response.status}`;
        const errorCode = responseData?.error?.code || response.status;

        logger.error('[WhatsApp] Meta Cloud API error', {
          status: response.status,
          errorCode,
          errorMsg,
          recipient: normalizedPhone,
        });

        return {
          success: false,
          status: 'FAILED',
          failureReason: `Meta API Error (${errorCode}): ${errorMsg}`,
        };
      }

      // Successful dispatch — extract provider message ID
      const providerMessageId = responseData?.messages?.[0]?.id || null;
      const contactWaId = responseData?.contacts?.[0]?.wa_id || null;

      logger.info('[WhatsApp] Message dispatched successfully', {
        providerMessageId,
        contactWaId,
        recipient: normalizedPhone,
      });

      return {
        success: true,
        status: 'SENT',
        providerMessageId,
        sentAt: new Date(),
      };
    } catch (error: any) {
      // Network / unexpected errors
      const errMsg = error?.message || 'WhatsApp Gateway dispatch error';
      logger.error('[WhatsApp] Unexpected dispatch error', {
        error: errMsg,
        recipient: normalizedPhone,
      });

      return {
        success: false,
        status: 'FAILED',
        failureReason: errMsg,
      };
    }
  }

  /**
   * Send a Meta approved template message with dynamic variables
   */
  async sendTemplate(params: {
    to: string;
    templateName: string;
    language?: string;
    variables?: string[];
    idempotencyKey: string;
  }): Promise<NotificationDeliveryResult> {
    const components: Array<{
      type: string;
      parameters: Array<{ type: string; text: string }>;
    }> = [];

    if (params.variables && params.variables.length > 0) {
      components.push({
        type: 'body',
        parameters: params.variables.map((v) => ({
          type: 'text',
          text: String(v),
        })),
      });
    }

    return this.send({
      channel: 'WHATSAPP',
      recipient: { phone: params.to },
      content: `Template: ${params.templateName}`,
      idempotencyKey: params.idempotencyKey,
      metadata: {
        template: {
          name: params.templateName,
          language: params.language || 'en',
          components,
        },
      },
    });
  }

  /**
   * Backwards-compatible legacy method for existing WhatsApp callers
   */
  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const result = await this.send({
      channel: 'WHATSAPP',
      recipient: { phone: options.to },
      content: options.message,
      idempotencyKey: options.idempotencyKey,
    });

    return {
      success: result.success,
      status: result.status as any,
      providerMessageId: result.providerMessageId,
      failureReason: result.failureReason,
    };
  }

  /**
   * Send a PDF document directly via Meta WhatsApp Cloud API
   * Uploads buffer to Meta Media endpoint, then delivers document message.
   */
  async sendDocument(params: {
    recipientPhone: string;
    buffer: Buffer;
    filename: string;
    caption?: string;
    template?: {
      name: string;
      language?: string;
      variables?: (string | number)[];
    };
  }): Promise<NotificationDeliveryResult> {
    const recipientPhone = params.recipientPhone;

    if (!recipientPhone || recipientPhone.trim().length === 0) {
      return {
        success: false,
        status: 'FAILED',
        failureReason: 'Recipient phone number is missing',
      };
    }

    const normalizedPhone = this.normalizePhone(recipientPhone);

    if (!this.isConfigured()) {
      return {
        success: true,
        status: 'QUEUED',
        providerMessageId: `queued-doc-${Date.now()}`,
      };
    }

    try {
      // 1. Upload media buffer to Meta Media API
      const formData = new FormData();
      const blob = new Blob([params.buffer], { type: 'application/pdf' });
      formData.append('file', blob, params.filename);
      formData.append('type', 'application/pdf');
      formData.append('messaging_product', 'whatsapp');

      const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: formData,
      });

      const uploadData = (await uploadRes.json()) as any;
      if (!uploadRes.ok || !uploadData.id) {
        throw new Error(`Media upload failed: ${JSON.stringify(uploadData)}`);
      }

      const mediaId = uploadData.id;

      // 2. If a template is configured (e.g. invoice_pdf_receipt), try Meta Approved Document Template first
      if (params.template?.name) {
        const templatePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'template',
          template: {
            name: params.template.name,
            language: { code: params.template.language || 'en' },
            components: [
              {
                type: 'header',
                parameters: [
                  {
                    type: 'document',
                    document: {
                      id: mediaId,
                      filename: params.filename,
                    },
                  },
                ],
              },
              ...(params.template.variables && params.template.variables.length > 0
                ? [
                    {
                      type: 'body',
                      parameters: params.template.variables.map((v) => ({
                        type: 'text',
                        text: String(v ?? ''),
                      })),
                    },
                  ]
                : []),
            ],
          },
        };

        const templateRes = await fetch(this.apiBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(templatePayload),
        });

        const templateData = (await templateRes.json()) as any;
        if (templateRes.ok && templateData.messages?.[0]?.id) {
          return {
            success: true,
            status: 'SENT',
            providerMessageId: templateData.messages[0].id,
          };
        }
        logger.warn('[WhatsApp] Template document send failed, falling back to standard document:', templateData);
      }

      // 3. Fallback: Dispatch standard document message via Meta Cloud API
      const metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'document',
        document: {
          id: mediaId,
          filename: params.filename,
          caption: params.caption || `Reçu OMEGA SPA — ${params.filename}`,
        },
      };

      const sendRes = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(metaPayload),
      });

      const sendData = (await sendRes.json()) as any;
      if (!sendRes.ok) {
        throw new Error(`Document dispatch failed: ${JSON.stringify(sendData)}`);
      }

      const messageId = sendData.messages?.[0]?.id || `meta-doc-${Date.now()}`;
      return {
        success: true,
        status: 'SENT',
        providerMessageId: messageId,
      };
    } catch (err: any) {
      logger.error('[WhatsApp] Failed to send PDF document', { error: err.message });
      return {
        success: false,
        status: 'FAILED',
        failureReason: err.message,
      };
    }
  }

  /**
   * Normalize phone number for Meta API
   * Strips leading '+', spaces, dashes. Ensures numeric-only format.
   * Auto-prepends Cameroon country code (237) if a 9-digit local number (6xx/2xx) is entered.
   */
  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
    // Cameroon local mobile/landline numbers are 9 digits (starting with 6 or 2)
    if (cleaned.length === 9 && (cleaned.startsWith('6') || cleaned.startsWith('2'))) {
      return `237${cleaned}`;
    }
    return cleaned;
  }
}

export const whatsappAdapter = new WhatsAppProviderAdapter();
