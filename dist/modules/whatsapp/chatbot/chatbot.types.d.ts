export interface IncomingWhatsAppMessage {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: {
        body: string;
    };
    name?: string;
}
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
}
export interface ClientMemoryContext {
    phone: string;
    clientName?: string;
    isRegistered: boolean;
    totalVisits: number;
    lastVisitDate?: string;
    lastServiceName?: string;
    lastTechnicianName?: string;
    loyaltyBalance: number;
    quartier?: string;
}
export interface SessionData {
    phone: string;
    clientName?: string;
    language: 'fr' | 'en';
    messages: ChatMessage[];
    lastActive: number;
    memory: ClientMemoryContext;
}
export interface OpenAIToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required?: string[];
        };
    };
}
//# sourceMappingURL=chatbot.types.d.ts.map