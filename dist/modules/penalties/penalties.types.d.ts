/**
 * OMEGA SPA POS — Penalties & Conduct Rules Types
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */
export interface ConductRule {
    id: string;
    name: string;
    defaultAmount: number;
    description: string;
}
export declare const STANDARD_CONDUCT_RULES: ConductRule[];
export interface CreatePenaltyInput {
    staffId: string;
    ruleName: string;
    penaltyAmount: number;
    date: string;
    notes?: string;
    recordedById: string;
}
export interface PenaltyFilterQuery {
    staffId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    month?: string;
}
export interface PenaltyRecordResponse {
    id: string;
    staffId: string;
    staffName: string;
    staffEmail: string;
    staffRole: string;
    ruleName: string;
    penaltyAmount: number;
    date: string;
    notes?: string | null;
    recordedById: string;
    recordedByName: string;
    createdAt: string;
}
//# sourceMappingURL=penalties.types.d.ts.map