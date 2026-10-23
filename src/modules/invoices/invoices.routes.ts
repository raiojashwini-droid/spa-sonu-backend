import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// GET /api/v1/invoices/:id/pdf — Download or view generated official invoice PDF
router.get('/:id/pdf', (req, res, next) => invoicesController.getInvoicePdf(req, res, next));

// All subsequent invoice routes require authentication
router.use(authMiddleware);

// POST /api/v1/invoices — Create invoice from completed appointment services (Manager, Reception, Technician, Marketer)
router.post(
  '/',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'),
  (req, res, next) => invoicesController.createInvoice(req, res, next)
);

// GET /api/v1/invoices/pending — List pending payment invoices (Manager, Reception, Technician, Marketer)
router.get(
  '/pending',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'),
  (req, res, next) => invoicesController.getPendingInvoices(req, res, next)
);

// GET /api/v1/invoices — List all invoices (Manager, Reception, Technician, Marketer)
router.get(
  '/',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'),
  (req, res, next) => invoicesController.getInvoices(req, res, next)
);

// GET /api/v1/invoices/:id — Get single invoice (Manager, Reception, Technician, Marketer)
router.get(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'),
  (req, res, next) => invoicesController.getInvoiceById(req, res, next)
);

// RBAC: MANAGER & RECEPTION only for mutation routes. TECHNICIAN & CLEANER blocked.
router.use(allowRoles('MANAGER', 'RECEPTION'));

// POST /api/v1/invoices/:id/items — Add items (retail products) to invoice
router.post('/:id/items', (req, res, next) => invoicesController.addInvoiceItem(req, res, next));
router.post('/:id/retail-items', (req, res, next) => invoicesController.addInvoiceItem(req, res, next));

// PATCH /api/v1/invoices/:id — Update invoice (discount, status)
router.patch('/:id', (req, res, next) => invoicesController.updateInvoice(req, res, next));

export default router;
