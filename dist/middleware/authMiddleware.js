"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const constants_1 = require("../config/constants");
const response_1 = require("../utils/response");
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            (0, response_1.sendError)(res, 'Authorization token required', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            (0, response_1.sendError)(res, 'Authentication token missing', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = {
            id: decoded.userId,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Invalid or expired token', constants_1.HTTP_STATUS.UNAUTHORIZED);
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=authMiddleware.js.map