"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clients_controller_1 = require("./clients.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// All client routes require authentication
router.use(authMiddleware_1.authMiddleware);
// POST /api/v1/clients — Create Client (Manager, Reception, Technician, Marketer)
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => clients_controller_1.clientsController.createClient(req, res, next));
// GET /api/v1/clients — Client List (Manager, Reception, Technician, Marketer)
router.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => clients_controller_1.clientsController.getClients(req, res, next));
// GET /api/v1/clients/:id — Client Details (Manager, Reception, Technician, Marketer)
router.get('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => clients_controller_1.clientsController.getClientById(req, res, next));
// PUT /api/v1/clients/:id & PATCH /api/v1/clients/:id — Update Client (Manager, Reception only; Technician forbidden)
router.put('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => clients_controller_1.clientsController.updateClient(req, res, next));
router.patch('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => clients_controller_1.clientsController.updateClient(req, res, next));
// PATCH /api/v1/clients/:id/status — Set Status (Manager, Reception)
router.patch('/:id/status', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => clients_controller_1.clientsController.setClientStatus(req, res, next));
// POST /api/v1/clients/:id/activate & /restore — Restore Active (Manager, Reception)
router.post('/:id/activate', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => clients_controller_1.clientsController.activateClient(req, res, next));
router.post('/:id/restore', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => clients_controller_1.clientsController.activateClient(req, res, next));
// POST /api/v1/clients/:id/deactivate — Mark as Inactive (Manager, Reception)
router.post('/:id/deactivate', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => clients_controller_1.clientsController.deactivateClient(req, res, next));
// DELETE /api/v1/clients/:id — Deactivate Client (Manager only)
router.delete('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => clients_controller_1.clientsController.deleteClient(req, res, next));
// POST /api/v1/clients/:id/media — Add Client Media (Manager, Reception, Technician)
router.post('/:id/media', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => clients_controller_1.clientsController.addClientMedia(req, res, next));
// GET /api/v1/clients/:id/history — Get Client History (Manager, Reception, Technician)
router.get('/:id/history', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => clients_controller_1.clientsController.getClientHistory(req, res, next));
exports.default = router;
//# sourceMappingURL=clients.routes.js.map