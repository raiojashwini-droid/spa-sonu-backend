import { Router } from 'express';
import { clientsController } from './clients.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// All client routes require authentication
router.use(authMiddleware);

// POST /api/v1/clients — Create Client (Manager, Reception, Technician)
router.post(
  '/',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => clientsController.createClient(req, res, next)
);

// GET /api/v1/clients — Client List (Manager, Reception, Technician)
router.get(
  '/',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => clientsController.getClients(req, res, next)
);

// GET /api/v1/clients/:id — Client Details (Manager, Reception, Technician)
router.get(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => clientsController.getClientById(req, res, next)
);

// PUT /api/v1/clients/:id & PATCH /api/v1/clients/:id — Update Client (Manager, Reception only; Technician forbidden)
router.put(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => clientsController.updateClient(req, res, next)
);
router.patch(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => clientsController.updateClient(req, res, next)
);

// PATCH /api/v1/clients/:id/status — Set Status (Manager, Reception)
router.patch(
  '/:id/status',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => clientsController.setClientStatus(req, res, next)
);

// POST /api/v1/clients/:id/activate & /restore — Restore Active (Manager, Reception)
router.post(
  '/:id/activate',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => clientsController.activateClient(req, res, next)
);
router.post(
  '/:id/restore',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => clientsController.activateClient(req, res, next)
);

// POST /api/v1/clients/:id/deactivate — Mark as Inactive (Manager, Reception)
router.post(
  '/:id/deactivate',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => clientsController.deactivateClient(req, res, next)
);

// DELETE /api/v1/clients/:id — Deactivate Client (Manager only)
router.delete(
  '/:id',
  allowRoles('MANAGER'),
  (req, res, next) => clientsController.deleteClient(req, res, next)
);

// POST /api/v1/clients/:id/media — Add Client Media (Manager, Reception, Technician)
router.post(
  '/:id/media',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => clientsController.addClientMedia(req, res, next)
);

// GET /api/v1/clients/:id/history — Get Client History (Manager, Reception, Technician)
router.get(
  '/:id/history',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => clientsController.getClientHistory(req, res, next)
);

export default router;
