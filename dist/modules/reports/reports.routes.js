"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reports_controller_1 = require("./reports.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// Technician / Marketer self-performance report (Technician, Marketer, Reception, Manager)
router.get('/technicians/me', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => reports_controller_1.reportsController.getMyTechnicianPerformance(req, res, next));
// Specific technician / marketer report by ID (Technician/Marketer scoped to self, Reception & Manager can view)
router.get('/technicians/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => reports_controller_1.reportsController.getTechnicianById(req, res, next));
// All technicians performance list (Manager & Reception only; Technician & Cleaner blocked)
router.get('/technicians', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => reports_controller_1.reportsController.getTechniciansPerformance(req, res, next));
// Dashboard Summary Cards (Manager & Reception only; Technician & Cleaner blocked)
router.get('/dashboard', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => reports_controller_1.reportsController.getDashboardSummary(req, res, next));
// Revenue Report & Payment Method Breakdown (Manager & Reception only; Technician & Cleaner blocked)
router.get('/revenue', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => reports_controller_1.reportsController.getRevenueReport(req, res, next));
// Appointment Analytics (Manager & Reception only; Technician & Cleaner blocked)
router.get('/appointments', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => reports_controller_1.reportsController.getAppointmentAnalytics(req, res, next));
// Top Services Report (Manager & Reception only; Technician & Cleaner blocked)
router.get('/top-services', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => reports_controller_1.reportsController.getTopServices(req, res, next));
// Service Performance Analytics (Best, Worst, Ignored 0%) (Manager & Reception only)
router.get('/service-performance', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => reports_controller_1.reportsController.getServicePerformance(req, res, next));
// Stock Consumption Analytics (Manager & Reception only; Technician & Cleaner blocked)
router.get('/stock-consumption', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => reports_controller_1.reportsController.getStockConsumptionReport(req, res, next));
// Customer Analytics, Loyalty Growth & Rebooking (Manager & Reception only; Technician & Cleaner blocked)
router.get('/customers', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => reports_controller_1.reportsController.getCustomerAnalytics(req, res, next));
exports.default = router;
//# sourceMappingURL=reports.routes.js.map