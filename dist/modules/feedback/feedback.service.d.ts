import { CreateFeedbackTokenDto, SubmitFeedbackDto } from './feedback.types';
export declare class FeedbackService {
    /**
     * Generates or retrieves a feedback token for an appointment or client
     */
    generateFeedbackToken(data: CreateFeedbackTokenDto): Promise<{
        token: string;
        feedbackUrl: string;
        feedback: {
            client: {
                id: string;
                phone: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                status: string;
                whatsapp: string | null;
                quartier: string | null;
                birthday: Date | null;
                anniversary: Date | null;
                source: import(".prisma/client").$Enums.ClientSource;
                introducedByEmployeeId: string | null;
                referredByClientId: string | null;
                recommendedByName: string | null;
                recommendedByPhone: string | null;
                recommendedByDate: Date | null;
                firstAppointmentService: string | null;
                noShowCount: number;
                lastVisitAt: Date | null;
                lastServiceDate: Date | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            token: string | null;
            clientId: string | null;
            appointmentId: string | null;
            rating: number;
            comment: string | null;
            isSubmitted: boolean;
        };
    }>;
    /**
     * Public retrieval of feedback request details by token (no auth required)
     */
    getFeedbackByToken(token: string): Promise<{
        id: string;
        token: string | null;
        clientId: string | null;
        clientName: string;
        appointmentId: string | null;
        service: string;
        technician: string;
        date: string;
        rating: number;
        comment: string | null;
        isSubmitted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Public submission of rating and optional comment by token (no auth required)
     */
    submitFeedback(token: string, data: SubmitFeedbackDto): Promise<{
        success: boolean;
        message: string;
        feedback: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            token: string | null;
            clientId: string | null;
            appointmentId: string | null;
            rating: number;
            comment: string | null;
            isSubmitted: boolean;
        };
    }>;
    /**
     * Manager / Reception listing of all submitted client feedback
     */
    getAllFeedback(query?: {
        limit?: number;
        page?: number;
    }): Promise<{
        feedback: {
            id: string;
            clientId: string | null;
            clientName: string;
            appointmentId: string | null;
            service: string;
            technician: string;
            rating: number;
            comment: string | null;
            date: string;
            submitted: boolean;
            submittedAt: string;
            token: string | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
export declare const feedbackService: FeedbackService;
//# sourceMappingURL=feedback.service.d.ts.map