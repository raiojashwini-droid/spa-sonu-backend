import { Router } from 'express';
import { stockController } from './stock.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/stock/activity — Chronological activity logs (Technician sees own usage, Manager/Reception full)
router.get('/activity', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  stockController.getStockActivities(req, res, next)
);

// GET /api/v1/stock/retail — View retail products and stock
router.get('/retail', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  stockController.getRetailStock(req, res, next)
);

// POST /api/v1/stock/retail — Manager create retail product
router.post('/retail', allowRoles('MANAGER'), (req, res, next) =>
  stockController.createRetailProduct(req, res, next)
);

// PATCH /api/v1/stock/retail/:id — Manager update retail product (price, stock, active status)
router.patch('/retail/:id', allowRoles('MANAGER'), (req, res, next) =>
  stockController.updateRetailProduct(req, res, next)
);

// POST /api/v1/stock/retail/:id/refill — Manager refill retail product
router.post('/retail/:id/refill', allowRoles('MANAGER'), (req, res, next) =>
  stockController.refillRetailProduct(req, res, next)
);

// POST /api/v1/stock/retail/deduct — Deduct retail product stock on sale
router.post('/retail/deduct', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  stockController.deductRetailStock(req, res, next)
);

// GET /api/v1/stock — View service stock (Manager, Reception, Technician)
router.get('/', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  stockController.getServiceStock(req, res, next)
);

// POST /api/v1/stock — Manager creates new service stock item
router.post('/', allowRoles('MANAGER'), (req, res, next) =>
  stockController.createServiceStock(req, res, next)
);

// GET /api/v1/stock/:id — View single stock item
router.get('/:id', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  stockController.getStockById(req, res, next)
);

// POST /api/v1/stock/:id/refill — Manager refills service stock
router.post('/:id/refill', allowRoles('MANAGER'), (req, res, next) =>
  stockController.refillStock(req, res, next)
);

// POST /api/v1/stock/:id/adjust — Manager adjusts service stock
router.post('/:id/adjust', allowRoles('MANAGER'), (req, res, next) =>
  stockController.adjustStock(req, res, next)
);

// PATCH /api/v1/stock/:id — Manager updates service stock details
router.patch('/:id', allowRoles('MANAGER'), (req, res, next) =>
  stockController.updateStock(req, res, next)
);

// DELETE /api/v1/stock/retail/:id — Manager deletes retail product
router.delete('/retail/:id', allowRoles('MANAGER'), (req, res, next) =>
  stockController.deleteRetailProduct(req, res, next)
);

// DELETE /api/v1/stock/:id — Manager deletes service stock item
router.delete('/:id', allowRoles('MANAGER'), (req, res, next) =>
  stockController.deleteServiceStock(req, res, next)
);

export default router;
