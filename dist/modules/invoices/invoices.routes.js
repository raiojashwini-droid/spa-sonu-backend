"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoices_controller_1 = require("./invoices.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// GET /api/v1/invoices/:id/pdf — Download or view generated official invoice PDF
router.get('/:id/pdf', (req, res, next) => invoices_controller_1.invoicesController.getInvoicePdf(req, res, next));
// All subsequent invoice routes require authentication
router.use(authMiddleware_1.authMiddleware);
// POST /api/v1/invoices — Create invoice from completed appointment services (Manager, Reception, Technician, Marketer)
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => invoices_controller_1.invoicesController.createInvoice(req, res, next));
// GET /api/v1/invoices/pending — List pending payment invoices (Manager, Reception, Technician, Marketer)
router.get('/pending', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => invoices_controller_1.invoicesController.getPendingInvoices(req, res, next));
// GET /api/v1/invoices — List all invoices (Manager, Reception, Technician, Marketer)
router.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => invoices_controller_1.invoicesController.getInvoices(req, res, next));
// GET /api/v1/invoices/:id — Get single invoice (Manager, Reception, Technician, Marketer)
router.get('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => invoices_controller_1.invoicesController.getInvoiceById(req, res, next));
// RBAC: MANAGER & RECEPTION only for mutation routes. TECHNICIAN & CLEANER blocked.
router.use((0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'));
// POST /api/v1/invoices/:id/items — Add items (retail products) to invoice
router.post('/:id/items', (req, res, next) => invoices_controller_1.invoicesController.addInvoiceItem(req, res, next));
router.post('/:id/retail-items', (req, res, next) => invoices_controller_1.invoicesController.addInvoiceItem(req, res, next));
// PATCH /api/v1/invoices/:id — Update invoice (discount, status)
router.patch('/:id', (req, res, next) => invoices_controller_1.invoicesController.updateInvoice(req, res, next));
exports.default = router;
//# sourceMappingURL=invoices.routes.js.map