export interface CreateFeedbackTokenDto {
    token?: string;
    clientId?: string;
    appointmentId?: string;
    clientName?: string;
    service?: string;
    technician?: string;
}
export interface SubmitFeedbackDto {
    rating: number;
    comment?: string;
}
export interface FeedbackResponseDto {
    id: string;
    token: string;
    clientId?: string | null;
    clientName: string;
    appointmentId?: string | null;
    service: string;
    technician: string;
    date: string;
    rating: number;
    comment?: string | null;
    isSubmitted: boolean;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=feedback.types.d.ts.map