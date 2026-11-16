"use strict";
/**
 * OMEGA SPA POS — Application Constants
 *
 * Centralized constant values used across the backend.
 * Business-specific constants will be added in later phases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = exports.HTTP_STATUS = exports.API_PREFIX = exports.APP_TIMEZONE = exports.APP_NAME = void 0;
exports.APP_NAME = 'OMEGA SPA POS';
exports.APP_TIMEZONE = 'Africa/Douala';
exports.API_PREFIX = '/api/v1';
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};
exports.ROLES = {
    MANAGER: 'MANAGER',
    RECEPTION: 'RECEPTION',
    TECHNICIAN: 'TECHNICIAN',
    CLEANER: 'CLEANER',
    MARKETER: 'MARKETER',
};
//# sourceMappingURL=constants.js.map