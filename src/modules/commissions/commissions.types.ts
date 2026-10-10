import { CommissionStatus, CommissionActivityType } from '@prisma/client';

export interface CommissionQueryFilter {
  technicianId?: string;
  status?: CommissionStatus;
  startDate?: string;
  endDate?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AddBonusInput {
  bonusAmount: number;
  reason?: string;
}

export interface AdjustCommissionInput {
  adjustedAmount?: number;
  adjustedRate?: number;
  reason: string;
}

export interface SetCommissionRuleInput {
  serviceCategory: string;
  percentage: number;
  fixedAmount?: number;
}

export interface AuthContextUser {
  id: string;
  role: string;
}
