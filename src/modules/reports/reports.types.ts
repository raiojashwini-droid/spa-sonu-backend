import { PaymentMethod, AppointmentStatus } from '@prisma/client';

export type ReportPeriod = 'today' | 'weekly' | 'monthly' | 'custom';

export interface DateRangeQuery {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
}

export interface ParsedDateRange {
  startDate: Date;
  endDate: Date;
  period: ReportPeriod;
}

export interface AuthContextUser {
  id: string;
  role: string;
  email: string;
}

export interface DashboardSummaryResponse {
  period: ReportPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  cards: {
    totalRevenue: number;
    totalAppointments: number;
    completedServices: number;
    activeClients: number;
    pendingPayments: {
      count: number;
      amount: number;
    };
    totalCommissions?: number; // Only for MANAGER
  };
}

export interface RevenueReportResponse {
  period: ReportPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalRevenue: number;
  totalTransactions: number;
  paymentMethodBreakdown: Array<{
    method: PaymentMethod;
    count: number;
    amount: number;
    percentage: number;
  }>;
  timeline: Array<{
    date: string;
    amount: number;
    transactionCount: number;
  }>;
}

export interface AppointmentAnalyticsResponse {
  period: ReportPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalBookings: number;
  completionRate: number;
  noShowRate: number;
  lateRate: number;
  statusBreakdown: Array<{
    status: AppointmentStatus;
    count: number;
    percentage: number;
  }>;
}

export interface TopServiceItem {
  serviceId: string;
  serviceName: string;
  category: string;
  bookingsCount: number;
  revenueGenerated: number;
}

export interface TopServicesResponse {
  period: ReportPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  topByRevenue: TopServiceItem[];
  topByBookings: TopServiceItem[];
}

export interface TechnicianPerformanceItem {
  technicianId: string;
  technicianName: string;
  email: string;
  phone: string | null;
  servicesCompleted: number;
  revenueGenerated: number;
  commissionEarned?: number; // Hidden from RECEPTION
  averageTicket: number;
}

export interface TechnicianPerformanceResponse {
  period: ReportPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  technicians: TechnicianPerformanceItem[];
}

export interface StockConsumptionItem {
  serviceStockId: string;
  stockName: string;
  category: string | null;
  unit: string;
  totalConsumed: number;
  usageCount: number;
  currentStock: number;
}

export interface StockConsumptionReportResponse {
  period: ReportPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalUsageTransactions: number;
  items: StockConsumptionItem[];
}

export interface CustomerAnalyticsResponse {
  period: ReportPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  acquisition: {
    newClients: number;
    returningClients: number;
    totalActiveClients: number;
  };
  loyalty: {
    pointsEarned: number;
    pointsRedeemed: number;
    netGrowth: number;
  };
  rebookingStatus: {
    due: number;
    overdue: number;
    lapsed: number;
    active: number;
  };
}
