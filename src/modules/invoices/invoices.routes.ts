import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// GET /api/v1/invoices/:id/pdf — Download or view generated official invoice PDF
router.get('/:id/pdf', (req, res, next) => invoicesController.getInvoicePdf(req, res, next));

// All subsequent invoice routes require authentication
router.use(authMiddleware);

// POST /api/v1/invoices — Create invoice from completed appointment services (Manager, Reception, Technician)
router.post(
  '/',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => invoicesController.createInvoice(req, res, next)
);

// RBAC: MANAGER & RECEPTION only for remaining routes. TECHNICIAN & CLEANER blocked.
router.use(allowRoles('MANAGER', 'RECEPTION'));

// POST /api/v1/invoices/:id/items — Add items (retail products) to invoice
router.post('/:id/items', (req, res, next) => invoicesController.addInvoiceItem(req, res, next));
router.post('/:id/retail-items', (req, res, next) => invoicesController.addInvoiceItem(req, res, next));

// GET /api/v1/invoices/pending — List pending payment invoices
router.get('/pending', (req, res, next) => invoicesController.getPendingInvoices(req, res, next));

// GET /api/v1/invoices — List all invoices
router.get('/', (req, res, next) => invoicesController.getInvoices(req, res, next));

// GET /api/v1/invoices/:id — Get single invoice
router.get('/:id', (req, res, next) => invoicesController.getInvoiceById(req, res, next));

// PATCH /api/v1/invoices/:id — Update invoice (discount, status)
router.patch('/:id', (req, res, next) => invoicesController.updateInvoice(req, res, next));

export default router;
