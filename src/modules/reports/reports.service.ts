import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../config/constants';
import {
  DateRangeQuery,
  ParsedDateRange,
  ReportPeriod,
  AuthContextUser,
  DashboardSummaryResponse,
  RevenueReportResponse,
  AppointmentAnalyticsResponse,
  TopServicesResponse,
  TopServiceItem,
  TechnicianPerformanceResponse,
  TechnicianPerformanceItem,
  StockConsumptionReportResponse,
  StockConsumptionItem,
  CustomerAnalyticsResponse,
  ServicePerformanceResponse,
  ServicePerformanceItem,
} from './reports.types';
import {
  AppointmentStatus,
  AppointmentServiceStatus,
  StockActivityType,
  LoyaltyTransactionType,
  PaymentMethod,
  InvoiceStatus,
  InvoiceItemType,
} from '@prisma/client';

export class ReportsService {
  /**
   * Helper to resolve and parse date range from query parameters.
   */
  parseDateRange(query: DateRangeQuery): ParsedDateRange {
    const now = new Date();
    const period: ReportPeriod = query.period || 'monthly';

    let startDate: Date;
    let endDate: Date;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'weekly' || period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'monthly' || period === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'custom') {
      if (!query.startDate) {
        throw new AppError('startDate is required for custom date range', HTTP_STATUS.BAD_REQUEST);
      }
      startDate = new Date(query.startDate);
      if (isNaN(startDate.getTime())) {
        throw new AppError('Invalid startDate format', HTTP_STATUS.BAD_REQUEST);
      }
      startDate.setHours(0, 0, 0, 0);

      if (query.endDate) {
        endDate = new Date(query.endDate);
        if (isNaN(endDate.getTime())) {
          throw new AppError('Invalid endDate format', HTTP_STATUS.BAD_REQUEST);
        }
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
      }

      if (startDate > endDate) {
        throw new AppError('startDate cannot be after endDate', HTTP_STATUS.BAD_REQUEST);
      }
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = new Date(now);
    }

    return { startDate, endDate, period };
  }

  /**
   * 1. Dashboard Summary Cards
   */
  async getDashboardSummary(query: DateRangeQuery, authUser: AuthContextUser): Promise<DashboardSummaryResponse> {
    const { startDate, endDate, period } = this.parseDateRange(query);

    // Total revenue from Payment table in date range
    const paymentAgg = await prisma.payment.aggregate({
      where: {
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });
    let totalRevenue = Number(paymentAgg._sum.amount || 0);

    // Also include any invoices marked PAID in date range without a separate payment row
    const orphanedPaidInvoices = await prisma.invoice.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: InvoiceStatus.PAID,
        payments: { none: {} },
      },
      select: { total: true },
    });
    for (const inv of orphanedPaidInvoices) {
      totalRevenue += Number(inv.total || 0);
    }

    // Total appointments in date range
    const totalAppointments = await prisma.appointment.count({
      where: {
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Completed services in date range (both appointment services AND walk-in invoice services)
    const appointmentServicesCount = await prisma.appointmentService.count({
      where: {
        status: AppointmentServiceStatus.COMPLETED,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const walkInInvoiceServicesCount = await prisma.invoiceItem.count({
      where: {
        itemType: InvoiceItemType.SERVICE,
        appointmentServiceId: null,
        invoice: {
          date: { gte: startDate, lte: endDate },
          status: InvoiceStatus.PAID,
        },
      },
    });

    const completedServices = appointmentServicesCount + walkInInvoiceServicesCount;

    // Active clients
    const activeClients = await prisma.client.count({
      where: { isActive: true },
    });

    // Pending payments from Invoices
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING_PAYMENT',
      },
      include: {
        payments: true,
      },
    });

    let pendingAmount = 0;
    for (const inv of pendingInvoices) {
      const paidSum = inv.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const remaining = Math.max(0, Number(inv.total) - paidSum);
      pendingAmount += remaining;
    }

    // Commissions (Sensitive: only included for MANAGER)
    let totalCommissions: number | undefined = undefined;
    if (authUser.role === 'MANAGER') {
      const commsAgg = await prisma.technicianCommission.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          totalCommission: true,
        },
      });
      totalCommissions = Number(commsAgg._sum.totalCommission || 0);
    }

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      cards: {
        totalRevenue,
        totalAppointments,
        completedServices,
        activeClients,
        pendingPayments: {
          count: pendingInvoices.length,
          amount: pendingAmount,
        },
        ...(totalCommissions !== undefined && { totalCommissions }),
      },
    };
  }

  /**
   * 2. Revenue Analytics & Payment Method Breakdown
   */
  async getRevenueReport(query: DateRangeQuery): Promise<RevenueReportResponse> {
    const { startDate, endDate, period } = this.parseDateRange(query);

    // Aggregate payments in range
    const payments = await prisma.payment.findMany({
      where: {
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    let totalRevenue = 0;
    const methodCounts: Record<PaymentMethod, { count: number; amount: number }> = {
      CASH: { count: 0, amount: 0 },
      MTN_MOMO: { count: 0, amount: 0 },
      ORANGE_MONEY: { count: 0, amount: 0 },
    };

    const timelineMap = new Map<string, { amount: number; count: number }>();

    for (const p of payments) {
      const amt = Number(p.amount);
      totalRevenue += amt;

      if (methodCounts[p.paymentMethod]) {
        methodCounts[p.paymentMethod].count += 1;
        methodCounts[p.paymentMethod].amount += amt;
      }

      const dateKey = p.paidAt.toISOString().split('T')[0];
      const existing = timelineMap.get(dateKey) || { amount: 0, count: 0 };
      existing.amount += amt;
      existing.count += 1;
      timelineMap.set(dateKey, existing);
    }

    // Failsafe: include paid invoices without a separate payment row
    const orphanedPaidInvoices = await prisma.invoice.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: InvoiceStatus.PAID,
        payments: { none: {} },
      },
      select: { total: true, date: true },
    });
    for (const inv of orphanedPaidInvoices) {
      const amt = Number(inv.total || 0);
      totalRevenue += amt;
      methodCounts.CASH.count += 1;
      methodCounts.CASH.amount += amt;
      const dateKey = inv.date.toISOString().split('T')[0];
      const existing = timelineMap.get(dateKey) || { amount: 0, count: 0 };
      existing.amount += amt;
      existing.count += 1;
      timelineMap.set(dateKey, existing);
    }

    const paymentMethodBreakdown = Object.entries(methodCounts).map(([method, data]) => ({
      method: method as PaymentMethod,
      count: data.count,
      amount: data.amount,
      percentage: totalRevenue > 0 ? Number(((data.amount / totalRevenue) * 100).toFixed(2)) : 0,
    }));

    const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      amount: data.amount,
      transactionCount: data.count,
    }));

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalRevenue,
      totalTransactions: payments.length,
      paymentMethodBreakdown,
      timeline,
    };
  }

  /**
   * 3. Appointment Analytics
   */
  async getAppointmentAnalytics(query: DateRangeQuery): Promise<AppointmentAnalyticsResponse> {
    const { startDate, endDate, period } = this.parseDateRange(query);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const totalBookings = appointments.length;
    const statusCounts: Record<AppointmentStatus, number> = {
      SCHEDULED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      LATE: 0,
      NO_SHOW: 0,
      CANCELLED: 0,
    };

    for (const a of appointments) {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status] += 1;
      }
    }

    const completed = statusCounts.COMPLETED || 0;
    const noShow = statusCounts.NO_SHOW || 0;
    const late = statusCounts.LATE || 0;

    const completionRate = totalBookings > 0 ? Number(((completed / totalBookings) * 100).toFixed(2)) : 0;
    const noShowRate = totalBookings > 0 ? Number(((noShow / totalBookings) * 100).toFixed(2)) : 0;
    const lateRate = totalBookings > 0 ? Number(((late / totalBookings) * 100).toFixed(2)) : 0;

    const statusBreakdown = (Object.keys(statusCounts) as AppointmentStatus[]).map((status) => ({
      status,
      count: statusCounts[status],
      percentage: totalBookings > 0 ? Number(((statusCounts[status] / totalBookings) * 100).toFixed(2)) : 0,
    }));

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalBookings,
      completionRate,
      noShowRate,
      lateRate,
      statusBreakdown,
    };
  }

  /**
   * 4. Top Services Report (Ranked by revenue and bookings)
   */
  async getTopServices(query: DateRangeQuery & { limit?: number | string }): Promise<TopServicesResponse> {
    const { startDate, endDate, period } = this.parseDateRange(query);
    const limit = Math.max(1, Math.min(50, parseInt(String(query.limit || 10), 10)));

    // Fetch all completed appointment services in range
    const completedServices = await prisma.appointmentService.findMany({
      where: {
        status: AppointmentServiceStatus.COMPLETED,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    const serviceMap = new Map<string, TopServiceItem>();

    for (const cs of completedServices) {
      const sId = cs.serviceId || cs.id;
      const sName = cs.service?.name || 'Spa Service';
      const sCategory = cs.service?.category || 'General';
      const price = Number(cs.price);

      const existing = serviceMap.get(sId) || {
        serviceId: sId,
        serviceName: sName,
        category: sCategory,
        bookingsCount: 0,
        revenueGenerated: 0,
      };

      existing.bookingsCount += 1;
      existing.revenueGenerated += price;
      serviceMap.set(sId, existing);
    }

    const allServices = Array.from(serviceMap.values());

    const topByRevenue = [...allServices]
      .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
      .slice(0, limit);

    const topByBookings = [...allServices]
      .sort((a, b) => b.bookingsCount - a.bookingsCount)
      .slice(0, limit);

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      topByRevenue,
      topByBookings,
    };
  }

  /**
   * 4b. Service Performance Analytics Report (Best Performers, Worst Performers, Ignored 0%)
   * Analyzes all catalog services performed in the period (default: 30 days)
   */
  async getServicePerformance(query: DateRangeQuery): Promise<ServicePerformanceResponse> {
    const { startDate, endDate, period } = this.parseDateRange(query);

    // 1. Fetch all active catalog services
    const catalogServices = await prisma.service.findMany({
      select: { id: true, name: true, category: true, price: true, status: true },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch completed invoice items in date range
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        itemType: InvoiceItemType.SERVICE,
        invoice: {
          status: { in: [InvoiceStatus.PAID, InvoiceStatus.PENDING_PAYMENT] },
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      select: {
        id: true,
        serviceId: true,
        name: true,
        price: true,
        quantity: true,
        invoice: {
          select: {
            clientId: true,
          },
        },
      },
    });

    // 3. Fetch completed appointment services not linked to invoice items
    const completedAppointments = await prisma.appointmentService.findMany({
      where: {
        status: AppointmentServiceStatus.COMPLETED,
        completedAt: { gte: startDate, lte: endDate },
        invoiceItem: null,
      },
      select: {
        id: true,
        serviceId: true,
        price: true,
        service: {
          select: { name: true, category: true },
        },
        appointment: {
          select: {
            clientId: true,
          },
        },
      },
    });

    // Aggregation maps: keyed by normalized service identifier
    const serviceStats = new Map<string, {
      serviceId: string;
      serviceName: string;
      category: string;
      catalogPrice: number;
      timesSold: number;
      totalRevenue: number;
      clientIds: Set<string>;
    }>();

    // Initialize all active catalog services with 0 sales
    for (const s of catalogServices) {
      const normKey = s.name.trim().toLowerCase();
      serviceStats.set(normKey, {
        serviceId: s.id,
        serviceName: s.name,
        category: s.category || 'General',
        catalogPrice: Number(s.price) || 0,
        timesSold: 0,
        totalRevenue: 0,
        clientIds: new Set<string>(),
      });
    }

    // Helper to find or create stat bucket
    const recordSale = (sId: string | null, sName: string, price: number, qty: number, clientId?: string | null) => {
      const cleanName = (sName || 'Spa Service').trim();
      const normKey = cleanName.toLowerCase();
      let stat = serviceStats.get(normKey);

      if (!stat && sId) {
        for (const val of serviceStats.values()) {
          if (val.serviceId === sId) {
            stat = val;
            break;
          }
        }
      }

      if (!stat) {
        stat = {
          serviceId: sId || normKey,
          serviceName: cleanName,
          category: 'General',
          catalogPrice: price,
          timesSold: 0,
          totalRevenue: 0,
          clientIds: new Set<string>(),
        };
        serviceStats.set(normKey, stat);
      }

      stat.timesSold += qty;
      stat.totalRevenue += price * qty;
      if (clientId) {
        stat.clientIds.add(String(clientId));
      }
    };

    // Process Invoice Items
    for (const item of invoiceItems) {
      const p = Number(item.price) || 0;
      const q = Math.max(1, Number(item.quantity) || 1);
      recordSale(item.serviceId, item.name, p, q, item.invoice?.clientId);
    }

    // Process unlinked completed appointments
    for (const appt of completedAppointments) {
      const p = Number(appt.price) || 0;
      const sName = appt.service?.name || 'Spa Service';
      recordSale(appt.serviceId, sName, p, 1, appt.appointment?.clientId);
    }

    const allCalculated = Array.from(serviceStats.values());
    const totalServiceRevenue = allCalculated.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalTimesSold = allCalculated.reduce((sum, s) => sum + s.timesSold, 0);

    const allClientsSet = new Set<string>();
    for (const s of allCalculated) {
      s.clientIds.forEach((c) => allClientsSet.add(c));
    }

    // Map into ServicePerformanceItem array
    const mappedItems: ServicePerformanceItem[] = allCalculated.map((s) => {
      const revPct = totalServiceRevenue > 0 ? Number(((s.totalRevenue / totalServiceRevenue) * 100).toFixed(1)) : 0;
      const avgTicket = s.timesSold > 0 ? Math.round(s.totalRevenue / s.timesSold) : s.catalogPrice;
      return {
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        category: s.category,
        price: s.catalogPrice,
        timesSold: s.timesSold,
        totalRevenue: Math.round(s.totalRevenue),
        uniqueClients: s.clientIds.size,
        averageTicket: avgTicket,
        revenuePercentage: revPct,
      };
    });

    // 1. Ignored - 0% (Services with strictly 0 times sold)
    const ignoredServices = mappedItems
      .filter((s) => s.timesSold === 0)
      .sort((a, b) => a.serviceName.localeCompare(b.serviceName));

    // 2. Performing Services (timesSold > 0)
    const performingServices = mappedItems
      .filter((s) => s.timesSold > 0)
      .sort((a, b) => {
        if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
        return b.timesSold - a.timesSold;
      });

    let bestPerformers: ServicePerformanceItem[] = [];
    let worstPerformers: ServicePerformanceItem[] = [];

    if (performingServices.length <= 4) {
      const half = Math.ceil(performingServices.length / 2);
      bestPerformers = performingServices.slice(0, half);
      worstPerformers = performingServices.slice(half);
    } else {
      const midpoint = Math.ceil(performingServices.length / 2);
      bestPerformers = performingServices.slice(0, midpoint);
      worstPerformers = [...performingServices.slice(midpoint)].sort((a, b) => {
        if (a.timesSold !== b.timesSold) return a.timesSold - b.timesSold;
        return a.totalRevenue - b.totalRevenue;
      });
    }

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      kpi: {
        totalCatalogServices: catalogServices.length,
        performingServicesCount: performingServices.length,
        ignoredServicesCount: ignoredServices.length,
        totalServiceRevenue: Math.round(totalServiceRevenue),
        totalTimesSold,
        totalUniqueClients: allClientsSet.size,
      },
      bestPerformers,
      worstPerformers,
      ignoredServices,
    };
  }

  /**
   * 5. Technician Performance Report
   * Strict RBAC:
   * - TECHNICIAN: forced to own ID only.
   * - RECEPTION: operational report only (commission details omitted).
   * - MANAGER: full financial metrics.
   */
  async getTechnicianPerformance(
    query: DateRangeQuery & { technicianId?: string },
    authUser: AuthContextUser
  ): Promise<TechnicianPerformanceResponse> {
    const { startDate, endDate, period } = this.parseDateRange(query);

    // Scoping for technician
    let targetTechnicianId = query.technicianId;
    if (authUser.role === 'TECHNICIAN') {
      if (targetTechnicianId && targetTechnicianId !== authUser.id) {
        throw new AppError('Access forbidden: you can only view your own performance', HTTP_STATUS.FORBIDDEN);
      }
      targetTechnicianId = authUser.id;
    }

    // Fetch technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: { name: 'TECHNICIAN' },
        id: targetTechnicianId ? targetTechnicianId : undefined,
      },
      include: {
        staffProfile: true,
      },
    });

    const performanceList: TechnicianPerformanceItem[] = [];

    for (const tech of technicians) {
      // Completed services from both appointments AND paid invoices
      const [appointmentServices, invoiceServices] = await Promise.all([
        prisma.appointmentService.findMany({
          where: {
            technicianId: tech.id,
            status: AppointmentServiceStatus.COMPLETED,
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { price: true },
        }),
        prisma.invoiceItem.findMany({
          where: {
            technicianId: tech.id,
            itemType: InvoiceItemType.SERVICE,
            appointmentServiceId: null,
            invoice: {
              date: { gte: startDate, lte: endDate },
              status: InvoiceStatus.PAID,
            },
          },
          select: { price: true, quantity: true },
        }),
      ]);

      const servicesCompleted =
        appointmentServices.length +
        invoiceServices.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const revenueGenerated =
        appointmentServices.reduce((acc, s) => acc + Number(s.price), 0) +
        invoiceServices.reduce((acc, s) => acc + Number(s.price) * (s.quantity || 1), 0);
      const averageTicket = servicesCompleted > 0 ? Math.round(revenueGenerated / servicesCompleted) : 0;

      let commissionEarned: number | undefined = undefined;

      // Sensitive financial data: Hide commission details from RECEPTION
      if (authUser.role === 'MANAGER' || authUser.role === 'TECHNICIAN') {
        const commsAgg = await prisma.technicianCommission.aggregate({
          where: {
            technicianId: tech.id,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { totalCommission: true },
        });
        commissionEarned = Number(commsAgg._sum.totalCommission || 0);
      }

      performanceList.push({
        technicianId: tech.id,
        technicianName: tech.staffProfile?.name || tech.email,
        email: tech.email,
        phone: tech.staffProfile?.phone || null,
        servicesCompleted,
        revenueGenerated,
        ...(commissionEarned !== undefined && { commissionEarned }),
        averageTicket,
      });
    }

    // Sort by revenue generated descending
    performanceList.sort((a, b) => b.revenueGenerated - a.revenueGenerated);

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      technicians: performanceList,
    };
  }

  /**
   * 6. Stock Consumption Report (Aggregated from StockActivity)
   */
  async getStockConsumptionReport(query: DateRangeQuery): Promise<StockConsumptionReportResponse> {
    const { startDate, endDate, period } = this.parseDateRange(query);

    const activities = await prisma.stockActivity.findMany({
      where: {
        type: {
          in: [StockActivityType.CONSUMPTION, StockActivityType.SERVICE_USAGE],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        serviceStock: true,
      },
    });

    const stockMap = new Map<string, StockConsumptionItem>();

    for (const act of activities) {
      const stock = act.serviceStock;
      const consumedQty = Number(act.quantity);

      const existing = stockMap.get(act.serviceStockId) || {
        serviceStockId: act.serviceStockId,
        stockName: stock.name,
        category: stock.category,
        unit: stock.unit,
        totalConsumed: 0,
        usageCount: 0,
        currentStock: Number(stock.quantity),
      };

      existing.totalConsumed += consumedQty;
      existing.usageCount += 1;
      stockMap.set(act.serviceStockId, existing);
    }

    const items = Array.from(stockMap.values()).sort((a, b) => b.totalConsumed - a.totalConsumed);

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalUsageTransactions: activities.length,
      items,
    };
  }

  /**
   * 7. Customer Analytics (Acquisition, Loyalty Growth & Rebooking Retention)
   */
  async getCustomerAnalytics(query: DateRangeQuery): Promise<CustomerAnalyticsResponse> {
    const { startDate, endDate, period } = this.parseDateRange(query);

    // New clients created within range
    const newClients = await prisma.client.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Total active clients
    const totalActiveClients = await prisma.client.count({
      where: { isActive: true },
    });

    // Returning clients: Clients who have more than 1 completed appointment
    const clientCompletedCounts = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: {
        status: AppointmentStatus.COMPLETED,
      },
      _count: { id: true },
      having: {
        id: {
          _count: { gt: 1 },
        },
      },
    });
    const returningClients = clientCompletedCounts.length;

    // Loyalty growth: points earned vs redeemed in range
    const earnedAgg = await prisma.loyaltyTransaction.aggregate({
      where: {
        type: LoyaltyTransactionType.EARN,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { points: true },
    });

    const redeemedAgg = await prisma.loyaltyTransaction.aggregate({
      where: {
        type: LoyaltyTransactionType.REDEEM,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { points: true },
    });

    const pointsEarned = earnedAgg._sum.points || 0;
    const pointsRedeemed = redeemedAgg._sum.points || 0;
    const netGrowth = pointsEarned - pointsRedeemed;

    // Rebooking status distribution
    const now = new Date();
    const allClients = await prisma.client.findMany({
      where: { isActive: true },
      select: {
        id: true,
        lastVisitAt: true,
        appointments: {
          select: { status: true, appointmentDate: true },
          orderBy: { appointmentDate: 'desc' },
          take: 1,
        },
      },
    });

    let due = 0;
    let overdue = 0;
    let lapsed = 0;
    let active = 0;

    for (const c of allClients) {
      // Determine last visit across lastVisitAt and appointments
      let lastVisitTime = c.lastVisitAt ? new Date(c.lastVisitAt).getTime() : 0;
      if (c.appointments.length > 0 && c.appointments[0].status === AppointmentStatus.COMPLETED) {
        const apptTime = new Date(c.appointments[0].appointmentDate).getTime();
        if (apptTime > lastVisitTime) {
          lastVisitTime = apptTime;
        }
      }

      if (!lastVisitTime) {
        continue; // Client never visited
      }

      const diffMs = now.getTime() - lastVisitTime;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (days >= 90) {
        lapsed++;
      } else if (days >= 45) {
        overdue++;
      } else if (days >= 21) {
        due++;
      } else {
        active++;
      }
    }

    return {
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      acquisition: {
        newClients,
        returningClients,
        totalActiveClients,
      },
      loyalty: {
        pointsEarned,
        pointsRedeemed,
        netGrowth,
      },
      rebookingStatus: {
        due,
        overdue,
        lapsed,
        active,
      },
    };
  }
}

export const reportsService = new ReportsService();
