import { DateRangeQuery, ParsedDateRange, AuthContextUser, DashboardSummaryResponse, RevenueReportResponse, AppointmentAnalyticsResponse, TopServicesResponse, TechnicianPerformanceResponse, StockConsumptionReportResponse, CustomerAnalyticsResponse, ServicePerformanceResponse } from './reports.types';
export declare class ReportsService {
    /**
     * Helper to resolve and parse date range from query parameters.
     */
    parseDateRange(query: DateRangeQuery): ParsedDateRange;
    /**
     * 1. Dashboard Summary Cards
     */
    getDashboardSummary(query: DateRangeQuery, authUser: AuthContextUser): Promise<DashboardSummaryResponse>;
    /**
     * 2. Revenue Analytics & Payment Method Breakdown
     */
    getRevenueReport(query: DateRangeQuery): Promise<RevenueReportResponse>;
    /**
     * 3. Appointment Analytics
     */
    getAppointmentAnalytics(query: DateRangeQuery): Promise<AppointmentAnalyticsResponse>;
    /**
     * 4. Top Services Report (Ranked by revenue and bookings)
     */
    getTopServices(query: DateRangeQuery & {
        limit?: number | string;
    }): Promise<TopServicesResponse>;
    /**
     * 4b. Service Performance Analytics Report (Best Performers, Worst Performers, Ignored 0%)
     * Analyzes all catalog services performed in the period (default: 30 days)
     */
    getServicePerformance(query: DateRangeQuery): Promise<ServicePerformanceResponse>;
    /**
     * 5. Technician Performance Report
     * Strict RBAC:
     * - TECHNICIAN: forced to own ID only.
     * - RECEPTION: operational report only (commission details omitted).
     * - MANAGER: full financial metrics.
     */
    getTechnicianPerformance(query: DateRangeQuery & {
        technicianId?: string;
    }, authUser: AuthContextUser): Promise<TechnicianPerformanceResponse>;
    /**
     * 6. Stock Consumption Report (Aggregated from StockActivity)
     */
    getStockConsumptionReport(query: DateRangeQuery): Promise<StockConsumptionReportResponse>;
    /**
     * 7. Customer Analytics (Acquisition, Loyalty Growth & Rebooking Retention)
     */
    getCustomerAnalytics(query: DateRangeQuery): Promise<CustomerAnalyticsResponse>;
}
export declare const reportsService: ReportsService;
//# sourceMappingURL=reports.service.d.ts.map