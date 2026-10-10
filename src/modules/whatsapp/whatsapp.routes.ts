import { Router } from 'express';
import { whatsappController } from './whatsapp.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// Inbound webhook: GET for Meta verification handshake (public endpoint)
router.get('/webhook', (req, res, next) => whatsappController.verifyWebhook(req, res, next));

// Inbound webhook: POST for delivery status updates (public endpoint)
router.post('/webhook', (req, res, next) => whatsappController.handleWebhook(req, res, next));

// All subsequent routes require authentication
router.use(authMiddleware);

// GET /api/v1/whatsapp/automations - View automations (Manager, Reception)
router.get('/automations', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.getAutomations(req, res, next)
);

// GET /api/v1/whatsapp/automations/:type - View single automation setting (Manager, Reception)
router.get('/automations/:type', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.getAutomationByType(req, res, next)
);

// PATCH /api/v1/whatsapp/automations/:type - Update automation configuration (Manager only)
router.patch('/automations/:type', allowRoles('MANAGER'), (req, res, next) =>
  whatsappController.updateAutomation(req, res, next)
);

// POST /api/v1/whatsapp/triggers/process-reminders - Database-driven reminder processing (Manager, Reception)
router.post('/triggers/process-reminders', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.processReminders(req, res, next)
);

// POST /api/v1/whatsapp/triggers/after-service - After-service thank you trigger (Manager, Reception)
router.post('/triggers/after-service', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.triggerAfterService(req, res, next)
);

// POST /api/v1/whatsapp/triggers/payment-confirmation - Payment confirmation trigger (Manager, Reception)
router.post('/triggers/payment-confirmation', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.triggerPaymentConfirmation(req, res, next)
);

// POST /api/v1/whatsapp/triggers/send-invoice-pdf - Send official PDF Receipt via WhatsApp (Manager, Reception)
router.post('/triggers/send-invoice-pdf', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.sendInvoicePdf(req, res, next)
);

// GET /api/v1/whatsapp/invoices/:id/receipt-status - Check if receipt was already sent (Manager, Reception)
router.get('/invoices/:id/receipt-status', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.getInvoiceReceiptStatus(req, res, next)
);

// POST /api/v1/whatsapp/triggers/celebrations - Birthday & anniversary trigger (Manager, Reception)
router.post('/triggers/celebrations', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.triggerCelebrations(req, res, next)
);

// POST /api/v1/whatsapp/triggers/rebooking-reminders - Rebooking retention trigger (Manager, Reception)
router.post('/triggers/rebooking-reminders', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.triggerRebookingReminders(req, res, next)
);

// POST /api/v1/whatsapp/triggers/daily-close - Trigger Daily Close summary to Boss (Manager only)
router.post('/triggers/daily-close', allowRoles('MANAGER'), (req, res, next) =>
  whatsappController.triggerDailyClose(req, res, next)
);

// POST /api/v1/whatsapp/triggers/send - Dispatch single custom message with idempotency (Manager, Reception)
router.post('/triggers/send', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.sendCustom(req, res, next)
);

// GET /api/v1/whatsapp/logs - Audit logs with filtering & pagination (Manager, Reception)
router.get('/logs', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.getLogs(req, res, next)
);

// POST /api/v1/whatsapp/logs/:id/retry - Retry message (Manager, Reception)
router.post('/logs/:id/retry', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  whatsappController.retryMessage(req, res, next)
);

export default router;
