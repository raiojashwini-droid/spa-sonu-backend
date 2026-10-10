import { Router } from 'express';
import { expensesController } from './expenses.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/expenses — Manager and Reception can view expenses
router.get('/', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  expensesController.getExpenses(req, res, next)
);

// POST /api/v1/expenses — Manager and Reception can create operating expense
router.post('/', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  expensesController.createExpense(req, res, next)
);

// DELETE /api/v1/expenses/:id — Manager only
router.delete('/:id', allowRoles('MANAGER'), (req, res, next) =>
  expensesController.deleteExpense(req, res, next)
);

export default router;
