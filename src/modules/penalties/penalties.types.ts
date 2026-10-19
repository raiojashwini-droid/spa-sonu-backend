/**
 * OMEGA SPA POS — Penalties & Conduct Rules Types
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */

export interface ConductRule {
  id: string;
  name: string;
  defaultAmount: number; // In FCFA
  description: string;
}

export const STANDARD_CONDUCT_RULES: ConductRule[] = [
  {
    id: 'late_coming',
    name: 'Late coming',
    defaultAmount: 2000,
    description: 'Arriving late for scheduled shift without prior manager approval',
  },
  {
    id: 'no_show',
    name: 'No show / Missed work',
    defaultAmount: 5000,
    description: 'Unexcused absence or failure to report to work',
  },
  {
    id: 'not_dressed_properly',
    name: 'Not dressed properly',
    defaultAmount: 2000,
    description: 'Violation of salon uniform, hygiene, or professional dress code standards',
  },
  {
    id: 'rude_to_clients',
    name: 'Rude / Disrespectful to clients',
    defaultAmount: 5000,
    description: 'Unprofessional attitude, argument, or inappropriate behavior toward clients',
  },
  {
    id: 'sitting_in_rooms',
    name: 'Sitting / Hiding in rooms',
    defaultAmount: 2500,
    description: 'Idling, sitting, sleeping, or using personal phones inside service rooms during shift',
  },
];

export interface CreatePenaltyInput {
  staffId: string;
  ruleName: string;
  penaltyAmount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  recordedById: string;
}

export interface PenaltyFilterQuery {
  staffId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string; // YYYY-MM
}

export interface PenaltyRecordResponse {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  ruleName: string;
  penaltyAmount: number;
  date: string; // YYYY-MM-DD
  notes?: string | null;
  recordedById: string;
  recordedByName: string;
  createdAt: string;
}
