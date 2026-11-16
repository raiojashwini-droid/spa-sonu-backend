import { IncomingWhatsAppMessage } from './chatbot.types';
export declare class ChatbotService {
    private readonly openAiUrl;
    /**
     * Check if OpenAI API key is configured
     */
    isConfigured(): boolean;
    /**
     * Process an incoming WhatsApp message from a customer
     */
    handleIncomingMessage(msg: IncomingWhatsAppMessage): Promise<void>;
    /**
     * Execute multi-turn conversation with OpenAI including Tool Calling
     */
    private generateOpenAIResponse;
    /**
     * Mark message as read in Meta WhatsApp Cloud API
     */
    private markMessageAsRead;
    /**
     * Friendly fallback greeting when OPENAI_API_KEY is not yet plugged in
     */
    private getFallbackGreeting;
}
export declare const chatbotService: ChatbotService;
//# sourceMappingURL=chatbot.service.d.ts.map