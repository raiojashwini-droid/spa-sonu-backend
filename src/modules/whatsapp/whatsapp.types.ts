import { WhatsAppAutomationType, WhatsAppMessageStatus } from '@prisma/client';

export { WhatsAppAutomationType, WhatsAppMessageStatus };

export interface IWhatsAppProvider {
  sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
  getHealthStatus(): { isConfigured: boolean; providerName: string };
}

export interface SendMessageOptions {
  to: string;
  message: string;
  idempotencyKey: string;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  status: WhatsAppMessageStatus;
  failureReason?: string;
}

export interface AuthContextUser {
  id: string;
  role: string;
  email: string;
}

export interface UpdateAutomationInput {
  template?: string;
  isActive?: boolean;
  enabled?: boolean;
  timing?: string | null;
  scheduleTime?: string | null;
}

export interface SendCustomMessageInput {
  recipientPhone: string;
  message: string;
  clientId?: string;
  appointmentId?: string;
  invoiceId?: string;
  automationType?: WhatsAppAutomationType;
  idempotencyKey?: string;
}

export interface ProcessRemindersResult {
  processedCount: number;
  reminders24h: number;
  reminders24hSent: number;
  reminders2h: number;
  reminders2hSent: number;
  skippedCount: number;
  errors: string[];
}

export interface DailyCloseTriggerInput {
  businessDate?: string;
  date?: string;
  recipientPhone?: string;
}

export interface MessageLogsQueryFilter {
  status?: WhatsAppMessageStatus;
  automationType?: WhatsAppAutomationType;
  clientId?: string;
  appointmentId?: string;
  invoiceId?: string;
  phone?: string;
  page?: number;
  limit?: number;
}
