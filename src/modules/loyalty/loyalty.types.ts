import { LoyaltyTransactionType } from '@prisma/client';

export interface UpdateLoyaltySettingsInput {
  spendAmountForPoint?: number;
  pointsPerSpend?: number;
  pointsForDiscount?: number;
  discountAmount?: number;
  minPointsToRedeem?: number;
  birthdayRewardPoints?: number;
  anniversaryRewardPoints?: number;
  pointsExpiryEnabled?: boolean;
  expiryDays?: number;
  servicePoints?: Record<string, number>;
}

export interface AdjustPointsInput {
  pointsDelta: number;
  reason: string;
}

export interface RedeemPointsInput {
  pointsToRedeem: number;
}

export interface AwardRewardInput {
  rewardType: 'BIRTHDAY' | 'ANNIVERSARY';
  points?: number;
  note?: string;
}

export interface RebookingQueryFilter {
  status?: 'DUE' | 'OVERDUE' | 'LAPSED';
  daysInactive?: number | string;
  quartier?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AuthContextUser {
  id: string;
  role: string;
}
