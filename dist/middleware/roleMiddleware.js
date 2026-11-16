"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = exports.allowRoles = void 0;
const constants_1 = require("../config/constants");
const response_1 = require("../utils/response");
const allowRoles = (...allowedRoles) => {
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendError)(res, 'Authentication required', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        const userRole = String(req.user.role || '').toUpperCase();
        if (!normalizedAllowed.includes(userRole)) {
            (0, response_1.sendError)(res, 'Access forbidden: insufficient permissions', constants_1.HTTP_STATUS.FORBIDDEN);
            return;
        }
        next();
    };
};
exports.allowRoles = allowRoles;
exports.requireRoles = exports.allowRoles;
//# sourceMappingURL=roleMiddleware.js.map