import prisma from '../../../config/database';
import { SessionData, ClientMemoryContext, ChatMessage } from './chatbot.types';
import { SYSTEM_PERSONA_PROMPT, SPA_FAQS } from './chatbot.knowledge';
import { logger } from '../../../utils/logger';

// In-memory cache of active conversations: phone -> SessionData
const sessionStore = new Map<string, SessionData>();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export class ChatbotSessionManager {
  /**
   * Normalize phone number to standard key (strip +, spaces, dashes)
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Fetch customer memory from Prisma database
   */
  async getClientMemory(rawPhone: string): Promise<ClientMemoryContext> {
    const normalized = this.normalizePhone(rawPhone);

    try {
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { phone: rawPhone },
            { phone: normalized },
            { phone: `+${normalized}` },
            { whatsapp: rawPhone },
            { whatsapp: normalized },
            { whatsapp: `+${normalized}` },
          ],
        },
        include: {
          loyalty: true,
          appointments: {
            where: { status: 'COMPLETED' },
            orderBy: { appointmentDate: 'desc' },
            take: 1,
            include: {
              appointmentServices: {
                include: { service: true, technician: { include: { staffProfile: true } } },
              },
            },
          },
        },
      });

      if (!client) {
        return {
          phone: rawPhone,
          isRegistered: false,
          totalVisits: 0,
          loyaltyBalance: 0,
        };
      }

      const totalCompletedVisits = await prisma.appointment.count({
        where: { clientId: client.id, status: 'COMPLETED' },
      });

      const lastAppt = client.appointments[0];
      const lastService = lastAppt?.appointmentServices[0];

      return {
        phone: rawPhone,
        clientName: client.name,
        isRegistered: true,
        totalVisits: totalCompletedVisits,
        lastVisitDate: lastAppt?.appointmentDate
          ? lastAppt.appointmentDate.toISOString().split('T')[0]
          : undefined,
        lastServiceName: lastService?.service?.name || lastAppt?.serviceSummary || undefined,
        lastTechnicianName:
          lastService?.technician?.staffProfile?.name ||
          lastService?.technician?.email ||
          undefined,
        loyaltyBalance: client.loyalty?.balance || 0,
        quartier: client.quartier || undefined,
      };
    } catch (err: any) {
      logger.error('[Chatbot Session] Error retrieving client memory', { error: err?.message });
      return {
        phone: rawPhone,
        isRegistered: false,
        totalVisits: 0,
        loyaltyBalance: 0,
      };
    }
  }

  /**
   * Get or initialize session for a customer
   */
  async getOrCreateSession(rawPhone: string, senderName?: string): Promise<SessionData> {
    const normalizedKey = this.normalizePhone(rawPhone);
    const now = Date.now();

    let session = sessionStore.get(normalizedKey);

    // If session expired or missing, create fresh session
    if (!session || now - session.lastActive > SESSION_TTL_MS) {
      const memory = await this.getClientMemory(rawPhone);
      const effectiveName = memory.clientName || senderName;

      session = {
        phone: rawPhone,
        clientName: effectiveName,
        language: 'fr', // default to French for Douala, LLM auto-switches
        messages: [],
        lastActive: now,
        memory,
      };

      sessionStore.set(normalizedKey, session);
    } else {
      session.lastActive = now;
    }

    return session;
  }

  /**
   * Build complete message array to send to OpenAI, including System Persona and Memory Context
   */
  buildOpenAIMessages(session: SessionData): ChatMessage[] {
    const { memory } = session;

    let memoryContextString = `CURRENT CLIENT CONTEXT:\n- Phone: ${memory.phone}\n`;
    if (memory.isRegistered) {
      memoryContextString += `- Name: ${memory.clientName}\n`;
      memoryContextString += `- Status: Returning Loyal Client (Total Completed Visits: ${memory.totalVisits})\n`;
      if (memory.lastVisitDate) {
        memoryContextString += `- Last Visit: ${memory.lastVisitDate} (Service: ${memory.lastServiceName || 'Spa session'}, Tech: ${memory.lastTechnicianName || 'Team'})\n`;
      }
      memoryContextString += `- Loyalty Points: ${memory.loyaltyBalance} pts\n`;
      if (memory.quartier) {
        memoryContextString += `- Neighborhood/Quartier: ${memory.quartier}\n`;
      }
      memoryContextString += `NOTE: Welcome them back warmly by name! Mention their loyalty or past experience if relevant.`;
    } else {
      memoryContextString += `- Status: New Client\n`;
      if (session.clientName) {
        memoryContextString += `- Detected Name: ${session.clientName}\n`;
      }
      memoryContextString += `NOTE: Welcome them to Omega Spa Douala with warmth and introduce them to our luxury services.`;
    }

    // Add FAQ summary into system prompt
    const faqSummary = SPA_FAQS.map(
      (f, idx) => `[FAQ ${idx + 1}] Q: ${f.question_fr} / ${f.question_en} | A: ${f.answer_fr}`
    ).join('\n');

    const fullSystemPrompt = `${SYSTEM_PERSONA_PROMPT}\n\n${memoryContextString}\n\nKNOWLEDGE BASE FAQS:\n${faqSummary}`;

    const systemMessage: ChatMessage = {
      role: 'system',
      content: fullSystemPrompt,
    };

    // Keep up to 12 most recent conversation turns to avoid context overflow
    const recentMessages = session.messages.slice(-12);

    return [systemMessage, ...recentMessages];
  }

  /**
   * Append a message to the active session
   */
  appendMessage(rawPhone: string, message: ChatMessage): void {
    const normalizedKey = this.normalizePhone(rawPhone);
    const session = sessionStore.get(normalizedKey);
    if (session) {
      session.messages.push(message);
      session.lastActive = Date.now();
    }
  }

  /**
   * Clean up expired sessions periodically
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, session] of sessionStore.entries()) {
      if (now - session.lastActive > SESSION_TTL_MS) {
        sessionStore.delete(key);
      }
    }
  }
}

export const chatbotSessionManager = new ChatbotSessionManager();

// Run session cleanup every 30 minutes
setInterval(() => {
  chatbotSessionManager.cleanupExpired();
}, 30 * 60 * 1000);
