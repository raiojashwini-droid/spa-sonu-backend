"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersController = exports.UsersController = void 0;
const users_service_1 = require("./users.service");
const users_validation_1 = require("./users.validation");
const response_1 = require("../../utils/response");
const constants_1 = require("../../config/constants");
function getParamId(req) {
    const { id } = req.params;
    return Array.isArray(id) ? id[0] : id;
}
class UsersController {
    async getUsers(req, res, next) {
        try {
            const users = await users_service_1.usersService.getUsers();
            (0, response_1.sendSuccess)(res, users);
        }
        catch (error) {
            next(error);
        }
    }
    async getUserById(req, res, next) {
        try {
            const id = getParamId(req);
            const user = await users_service_1.usersService.getUserById(id);
            (0, response_1.sendSuccess)(res, user);
        }
        catch (error) {
            next(error);
        }
    }
    async createUser(req, res, next) {
        try {
            const validation = users_validation_1.createUserSchema.safeParse(req.body);
            if (!validation.success) {
                (0, response_1.sendError)(res, 'Validation failed', constants_1.HTTP_STATUS.BAD_REQUEST, validation.error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })));
                return;
            }
            const user = await users_service_1.usersService.createUser(validation.data);
            (0, response_1.sendSuccess)(res, user, constants_1.HTTP_STATUS.CREATED);
        }
        catch (error) {
            next(error);
        }
    }
    async updateUser(req, res, next) {
        try {
            const id = getParamId(req);
            const validation = users_validation_1.updateUserSchema.safeParse(req.body);
            if (!validation.success) {
                (0, response_1.sendError)(res, 'Validation failed', constants_1.HTTP_STATUS.BAD_REQUEST, validation.error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })));
                return;
            }
            const user = await users_service_1.usersService.updateUser(id, validation.data);
            (0, response_1.sendSuccess)(res, user);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteUser(req, res, next) {
        try {
            const id = getParamId(req);
            await users_service_1.usersService.deleteUser(id);
            (0, response_1.sendSuccess)(res, { message: 'User deactivated successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    async updateSalaryContract(req, res, next) {
        try {
            const id = getParamId(req);
            const contract = await users_service_1.usersService.updateSalaryContract(id, req.body);
            (0, response_1.sendSuccess)(res, contract, constants_1.HTTP_STATUS.OK, 'Salary contract updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UsersController = UsersController;
exports.usersController = new UsersController();
//# sourceMappingURL=users.controller.js.map