"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stock_controller_1 = require("./stock.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// GET /api/v1/stock/activity — Chronological activity logs (Technician sees own usage, Manager/Reception full)
router.get('/activity', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => stock_controller_1.stockController.getStockActivities(req, res, next));
// GET /api/v1/stock/retail — View retail products and stock
router.get('/retail', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => stock_controller_1.stockController.getRetailStock(req, res, next));
// POST /api/v1/stock/retail — Manager & Reception create retail product
router.post('/retail', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => stock_controller_1.stockController.createRetailProduct(req, res, next));
// PATCH /api/v1/stock/retail/:id — Manager & Reception update retail product (price, stock, active status)
router.patch('/retail/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => stock_controller_1.stockController.updateRetailProduct(req, res, next));
// POST /api/v1/stock/retail/:id/refill — Manager & Reception refill retail product
router.post('/retail/:id/refill', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => stock_controller_1.stockController.refillRetailProduct(req, res, next));
// POST /api/v1/stock/retail/deduct — Deduct retail product stock on sale
router.post('/retail/deduct', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => stock_controller_1.stockController.deductRetailStock(req, res, next));
// GET /api/v1/stock — View service stock (Manager, Reception, Technician)
router.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => stock_controller_1.stockController.getServiceStock(req, res, next));
// POST /api/v1/stock — Manager creates new service stock item
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => stock_controller_1.stockController.createServiceStock(req, res, next));
// ── Daily Stock Photo Audits ─────────────────────────────────────────
// POST /api/v1/stock/daily-audit — Technician or staff submits end-of-day stock photo + remarks
router.post('/daily-audit', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => stock_controller_1.stockController.submitDailyAudit(req, res, next));
// GET /api/v1/stock/daily-audit — View daily stock photo audits with filters
router.get('/daily-audit', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => stock_controller_1.stockController.getDailyAudits(req, res, next));
// PATCH /api/v1/stock/daily-audit/:id/review — Manager/Reception review audit
router.patch('/daily-audit/:id/review', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => stock_controller_1.stockController.reviewDailyAudit(req, res, next));
// DELETE /api/v1/stock/daily-audit/:id — Delete daily stock audit
router.delete('/daily-audit/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => stock_controller_1.stockController.deleteDailyAudit(req, res, next));
// GET /api/v1/stock/:id — View single stock item
router.get('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => stock_controller_1.stockController.getStockById(req, res, next));
// POST /api/v1/stock/:id/refill — Manager refills service stock
router.post('/:id/refill', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => stock_controller_1.stockController.refillStock(req, res, next));
// POST /api/v1/stock/:id/adjust — Manager adjusts service stock
router.post('/:id/adjust', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => stock_controller_1.stockController.adjustStock(req, res, next));
// PATCH /api/v1/stock/:id — Manager updates service stock details
router.patch('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => stock_controller_1.stockController.updateStock(req, res, next));
// DELETE /api/v1/stock/retail/:id — Manager & Reception delete retail product
router.delete('/retail/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => stock_controller_1.stockController.deleteRetailProduct(req, res, next));
// DELETE /api/v1/stock/:id — Manager deletes service stock item
router.delete('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => stock_controller_1.stockController.deleteServiceStock(req, res, next));
exports.default = router;
//# sourceMappingURL=stock.routes.js.map