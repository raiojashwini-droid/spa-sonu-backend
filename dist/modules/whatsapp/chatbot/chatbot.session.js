"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotSessionManager = exports.ChatbotSessionManager = void 0;
const database_1 = __importDefault(require("../../../config/database"));
const chatbot_knowledge_1 = require("./chatbot.knowledge");
const logger_1 = require("../../../utils/logger");
// In-memory cache of active conversations: phone -> SessionData
const sessionStore = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
class ChatbotSessionManager {
    /**
     * Normalize phone number to standard key (strip +, spaces, dashes)
     */
    normalizePhone(phone) {
        return phone.replace(/\D/g, '');
    }
    /**
     * Fetch customer memory from Prisma database
     */
    async getClientMemory(rawPhone) {
        const normalized = this.normalizePhone(rawPhone);
        try {
            const client = await database_1.default.client.findFirst({
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
            const totalCompletedVisits = await database_1.default.appointment.count({
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
                lastTechnicianName: lastService?.technician?.staffProfile?.name ||
                    lastService?.technician?.email ||
                    undefined,
                loyaltyBalance: client.loyalty?.balance || 0,
                quartier: client.quartier || undefined,
            };
        }
        catch (err) {
            logger_1.logger.error('[Chatbot Session] Error retrieving client memory', { error: err?.message });
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
    async getOrCreateSession(rawPhone, senderName) {
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
        }
        else {
            session.lastActive = now;
        }
        return session;
    }
    /**
     * Build complete message array to send to OpenAI, including System Persona and Memory Context
     */
    buildOpenAIMessages(session) {
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
        }
        else {
            memoryContextString += `- Status: New Client\n`;
            if (session.clientName) {
                memoryContextString += `- Detected Name: ${session.clientName}\n`;
            }
            memoryContextString += `NOTE: Welcome them to Omega Spa Douala with warmth and introduce them to our luxury services.`;
        }
        // Add FAQ summary into system prompt
        const faqSummary = chatbot_knowledge_1.SPA_FAQS.map((f, idx) => `[FAQ ${idx + 1}] Q: ${f.question_fr} / ${f.question_en} | A: ${f.answer_fr}`).join('\n');
        const fullSystemPrompt = `${chatbot_knowledge_1.SYSTEM_PERSONA_PROMPT}\n\n${memoryContextString}\n\nKNOWLEDGE BASE FAQS:\n${faqSummary}`;
        const systemMessage = {
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
    appendMessage(rawPhone, message) {
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
    cleanupExpired() {
        const now = Date.now();
        for (const [key, session] of sessionStore.entries()) {
            if (now - session.lastActive > SESSION_TTL_MS) {
                sessionStore.delete(key);
            }
        }
    }
}
exports.ChatbotSessionManager = ChatbotSessionManager;
exports.chatbotSessionManager = new ChatbotSessionManager();
// Run session cleanup every 30 minutes
setInterval(() => {
    exports.chatbotSessionManager.cleanupExpired();
}, 30 * 60 * 1000);
//# sourceMappingURL=chatbot.session.js.map