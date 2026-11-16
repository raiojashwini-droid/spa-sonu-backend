/**
 * OMEGA SPA POS — Penalties & Disciplinary Service
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */
import { ConductRule, CreatePenaltyInput, PenaltyFilterQuery, PenaltyRecordResponse } from './penalties.types';
export declare class PenaltiesService {
    /**
     * Get standard conduct rules catalog with recommended default amounts
     */
    getStandardRules(): ConductRule[];
    /**
     * Record a new disciplinary penalty for a staff member (Manager action)
     */
    createPenalty(input: CreatePenaltyInput): Promise<PenaltyRecordResponse>;
    /**
     * Retrieve penalty records with optional filters (staffId, date, date range, month)
     */
    getPenalties(filters: PenaltyFilterQuery): Promise<{
        penalties: PenaltyRecordResponse[];
        totalPenalties: number;
        count: number;
    }>;
    /**
     * Delete / void a mistaken penalty record (Manager only)
     */
    deletePenalty(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const penaltiesService: PenaltiesService;
//# sourceMappingURL=penalties.service.d.ts.map