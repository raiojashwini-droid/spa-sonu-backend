import { env } from '../../../config/env';
import { whatsappAdapter } from '../whatsapp.adapter';
import { chatbotSessionManager } from './chatbot.session';
import { CHATBOT_TOOLS_DEFINITIONS, executeChatbotTool } from './chatbot.tools';
import { ChatMessage, IncomingWhatsAppMessage } from './chatbot.types';
import { logger } from '../../../utils/logger';

export class ChatbotService {
  private readonly openAiUrl = 'https://api.openai.com/v1/chat/completions';

  /**
   * Check if OpenAI API key is configured
   */
  isConfigured(): boolean {
    return Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0);
  }

  /**
   * Process an incoming WhatsApp message from a customer
   */
  async handleIncomingMessage(msg: IncomingWhatsAppMessage): Promise<void> {
    const rawPhone = msg.from;
    const userText = msg.text?.body?.trim();
    const senderName = msg.name;

    if (!userText || !rawPhone) {
      logger.debug('[Chatbot] Ignoring non-text or empty incoming message', { msgId: msg.id });
      return;
    }

    logger.info('[Chatbot] Processing incoming customer message', {
      from: rawPhone,
      text: userText,
      messageId: msg.id,
    });

    // Mark message as read in Meta (non-blocking)
    this.markMessageAsRead(msg.id).catch((err) =>
      logger.warn('[Chatbot] Could not mark message as read', { error: err?.message })
    );

    // Retrieve or initialize session with memory
    const session = await chatbotSessionManager.getOrCreateSession(rawPhone, senderName);

    // Add user message to session
    chatbotSessionManager.appendMessage(rawPhone, {
      role: 'user',
      content: userText,
    });

    let replyText = '';

    // Currently respond with official OMEGA SPA BONAMOUSADI information greeting as requested
    replyText = this.getFallbackGreeting(session.clientName);

    // Append assistant response to session
    chatbotSessionManager.appendMessage(rawPhone, {
      role: 'assistant',
      content: replyText,
    });

    // Dispatch reply back to customer via WhatsApp
    const idempotencyKey = `chatbot-reply-${msg.id}-${Date.now()}`;
    await whatsappAdapter.sendMessage({
      to: rawPhone,
      message: replyText,
      idempotencyKey,
    });

    logger.info('[Chatbot] Reply dispatched to WhatsApp', { to: rawPhone, replyLength: replyText.length });
  }

  /**
   * Execute multi-turn conversation with OpenAI including Tool Calling
   */
  private async generateOpenAIResponse(session: any): Promise<string> {
    const apiKey = env.OPENAI_API_KEY.trim();
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';

    let messages = chatbotSessionManager.buildOpenAIMessages(session);
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;

      const payload = {
        model,
        messages,
        tools: CHATBOT_TOOLS_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 650,
      };

      const response = await fetch(this.openAiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
        throw new Error(`OpenAI API error: ${errorMsg}`);
      }

      const data: any = await response.json();
      const choice = data?.choices?.[0];
      const message = choice?.message;

      if (!message) {
        throw new Error('Empty response from OpenAI');
      }

      // If OpenAI did not call any tools, we have our final user response
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content || 'Bienvenue chez OMEGA SPA Douala ! Comment puis-je vous aider ?';
      }

      // OpenAI requested tool calls: execute them and add results to messages
      messages.push({
        role: 'assistant',
        content: message.content || null,
        tool_calls: message.tool_calls,
      });

      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function?.name;
        let toolArgs: Record<string, any> = {};

        try {
          toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch {
          toolArgs = {};
        }

        const toolResult = await executeChatbotTool(toolName, toolArgs);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(toolResult),
        });
      }
    }

    return "Merci de contacter OMEGA SPA BONAMOUSADI ! Pour confirmer votre rendez-vous ou pour toute question, notre réception est à votre écoute au +237 6 53 14 62 69.";
  }

  /**
   * Mark message as read in Meta WhatsApp Cloud API
   */
  private async markMessageAsRead(messageId: string): Promise<void> {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) return;

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    }).catch(() => {});
  }

  /**
   * Friendly fallback greeting when OPENAI_API_KEY is not yet plugged in
   */
  private getFallbackGreeting(clientName?: string): string {
    const greetingHeader = clientName
      ? `Bonjour ${clientName} et bienvenue chez OMEGA SPA BONAMOUSADI !`
      : `Bonjour et bienvenue chez OMEGA SPA BONAMOUSADI !`;

    return (
      `🌿 *${greetingHeader}*\n\n` +
      `📍 *Adresse :* Round point maetur Bonamousadi, Douala\n\n` +
      `🕒 *Horaires :*\n\n` +
      `Lundi–Mardi-Mercredi-Vendredi : 09hr–21hr.\n\n` +
      `Jeudi : 10hr-21hr.\n\n` +
      `Dimanche : 11hr–21hr\n\n` +
      `📞 *Réservation directe :* +237 6 53 14 62 69\n\n` +
      `Notre équipe à la réception vous accueille avec plaisir ! ✨`
    );
  }
}

export const chatbotService = new ChatbotService();

