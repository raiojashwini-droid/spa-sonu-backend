import { CommissionStatus, CommissionActivityType, CommissionType } from '@prisma/client';

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
  serviceCategory?: string;
  percentage?: number;
  fixedAmount?: number | null;
  type?: CommissionType;
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
  salesTotal?: number;
  spaTotalSales: number;
  targetQuota: number;
  targetProgressPercent: number;
  percentageAchieved?: number;
  isTargetMet: boolean;
  salesRemainingToTarget: number;
  remainingToTarget?: number;
}

export interface SalaryCalculationDetails {
  activeMode: 'FIXED_SALARY' | 'BASE_PLUS_COMMISSION';
  mode?: 'MODE_A_BELOW_TARGET' | 'MODE_B_TARGET_MET';
  modeLabel: string;
  commissionUnlocked?: boolean;
  fixedSalaryAmount: number;
  fixedSalaryFloor?: number;
  basePayAmount: number;
  basePay?: number;
  grossCommissionAccumulated: number;
  grossCommission?: number;
  referralDeductionsTotal: number;
  referralDeductions?: number;
  totalPenalties?: number;
  netCommissionAccumulated: number;
  netCommission?: number;
  unearnedCommissionLocked?: number;
  currentProjectedPayout: number;
  effectivePayout?: number;
  calculatedPayout?: number;
  floorProtectionApplied?: boolean;
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

