"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesController = exports.ExpensesController = void 0;
const expenses_service_1 = require("./expenses.service");
const expenses_validation_1 = require("./expenses.validation");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { id } = req.params;
    return Array.isArray(id) ? id[0] : id;
}
class ExpensesController {
    async getExpenses(req, res, next) {
        try {
            const query = expenses_validation_1.expenseQuerySchema.parse(req.query);
            const expenses = await expenses_service_1.expensesService.getExpenses(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: expenses,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createExpense(req, res, next) {
        try {
            const input = expenses_validation_1.createExpenseSchema.parse(req.body);
            const expense = await expenses_service_1.expensesService.createExpense(input, req.user.id);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                data: expense,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteExpense(req, res, next) {
        try {
            const id = getParamId(req);
            const result = await expenses_service_1.expensesService.deleteExpense(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ExpensesController = ExpensesController;
exports.expensesController = new ExpensesController();
//# sourceMappingURL=expenses.controller.js.map