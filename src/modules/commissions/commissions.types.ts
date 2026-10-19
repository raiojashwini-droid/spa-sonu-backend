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

export interface SalaryContractSettings {
  monthlyTarget: number;
  basePay: number;
  commissionRate: number;
  fixedSalary: number;
  targetScope: string;
}

export interface SalaryPerformanceMetrics {
  mtdSales: number;
  spaTotalSales: number;
  targetQuota: number;
  targetProgressPercent: number;
  isTargetMet: boolean;
  salesRemainingToTarget: number;
}

export interface SalaryCalculationDetails {
  activeMode: 'FIXED_SALARY' | 'BASE_PLUS_COMMISSION';
  modeLabel: string;
  fixedSalaryAmount: number;
  basePayAmount: number;
  grossCommissionAccumulated: number;
  referralDeductionsTotal: number;
  netCommissionAccumulated: number;
  currentProjectedPayout: number;
  projectedPayoutAtExactTarget: number;
  potentialGainOnReachingTarget: number;
}

export interface SalarySummaryData {
  technicianId: string;
  technicianName: string;
  role: string;
  specialty: string;
  period: string;
  periodYearMonth: string;
  contract: SalaryContractSettings;
  performance: SalaryPerformanceMetrics;
  calculation: SalaryCalculationDetails;
  isFinalized: boolean;
}

