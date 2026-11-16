"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const auth_validation_1 = require("./auth.validation");
const constants_1 = require("../../config/constants");
const response_1 = require("../../utils/response");
class AuthController {
    async login(req, res, next) {
        try {
            const validationResult = auth_validation_1.loginSchema.safeParse(req.body);
            if (!validationResult.success) {
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationResult.error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
                return;
            }
            const result = await auth_service_1.authService.login(validationResult.data);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                token: result.token,
                user: result.user,
                data: {
                    token: result.token,
                    user: result.user,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCurrentUser(req, res, next) {
        try {
            if (!req.user || !req.user.id) {
                (0, response_1.sendError)(res, 'Unauthorized', constants_1.HTTP_STATUS.UNAUTHORIZED);
                return;
            }
            const user = await auth_service_1.authService.getCurrentUser(req.user.id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                id: user.id,
                email: user.email,
                role: user.role,
                staffProfile: user.staffProfile,
                data: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    staffProfile: user.staffProfile,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map