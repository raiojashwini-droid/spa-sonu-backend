import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authMiddleware);

// Technician self-performance report (Technician, Reception, Manager)
router.get('/technicians/me', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  reportsController.getMyTechnicianPerformance(req, res, next)
);

// Specific technician report by ID (Technician scoped to self, Reception & Manager can view)
router.get('/technicians/:id', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  reportsController.getTechnicianById(req, res, next)
);

// All technicians performance list (Manager & Reception only; Technician & Cleaner blocked)
router.get('/technicians', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  reportsController.getTechniciansPerformance(req, res, next)
);

// Dashboard Summary Cards (Manager & Reception only; Technician & Cleaner blocked)
router.get('/dashboard', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  reportsController.getDashboardSummary(req, res, next)
);

// Revenue Report & Payment Method Breakdown (Manager & Reception only; Technician & Cleaner blocked)
router.get('/revenue', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  reportsController.getRevenueReport(req, res, next)
);

// Appointment Analytics (Manager & Reception only; Technician & Cleaner blocked)
router.get('/appointments', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  reportsController.getAppointmentAnalytics(req, res, next)
);

// Top Services Report (Manager & Reception only; Technician & Cleaner blocked)
router.get('/top-services', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  reportsController.getTopServices(req, res, next)
);

// Stock Consumption Analytics (Manager & Reception only; Technician & Cleaner blocked)
router.get('/stock-consumption', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  reportsController.getStockConsumptionReport(req, res, next)
);

// Customer Analytics, Loyalty Growth & Rebooking (Manager & Reception only; Technician & Cleaner blocked)
router.get('/customers', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  reportsController.getCustomerAnalytics(req, res, next)
);

export default router;
