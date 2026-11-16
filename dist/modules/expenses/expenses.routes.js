"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expenses_controller_1 = require("./expenses.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// GET /api/v1/expenses — Manager and Reception can view expenses
router.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => expenses_controller_1.expensesController.getExpenses(req, res, next));
// POST /api/v1/expenses — Manager and Reception can create operating expense
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => expenses_controller_1.expensesController.createExpense(req, res, next));
// DELETE /api/v1/expenses/:id — Manager only
router.delete('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => expenses_controller_1.expensesController.deleteExpense(req, res, next));
exports.default = router;
//# sourceMappingURL=expenses.routes.js.map