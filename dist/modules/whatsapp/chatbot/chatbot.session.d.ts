import { SessionData, ClientMemoryContext, ChatMessage } from './chatbot.types';
export declare class ChatbotSessionManager {
    /**
     * Normalize phone number to standard key (strip +, spaces, dashes)
     */
    private normalizePhone;
    /**
     * Fetch customer memory from Prisma database
     */
    getClientMemory(rawPhone: string): Promise<ClientMemoryContext>;
    /**
     * Get or initialize session for a customer
     */
    getOrCreateSession(rawPhone: string, senderName?: string): Promise<SessionData>;
    /**
     * Build complete message array to send to OpenAI, including System Persona and Memory Context
     */
    buildOpenAIMessages(session: SessionData): ChatMessage[];
    /**
     * Append a message to the active session
     */
    appendMessage(rawPhone: string, message: ChatMessage): void;
    /**
     * Clean up expired sessions periodically
     */
    cleanupExpired(): void;
}
export declare const chatbotSessionManager: ChatbotSessionManager;
//# sourceMappingURL=chatbot.session.d.ts.map