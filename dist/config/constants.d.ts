/**
 * OMEGA SPA POS — Application Constants
 *
 * Centralized constant values used across the backend.
 * Business-specific constants will be added in later phases.
 */
export declare const APP_NAME = "OMEGA SPA POS";
export declare const APP_TIMEZONE = "Africa/Douala";
export declare const API_PREFIX = "/api/v1";
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly INTERNAL_SERVER_ERROR: 500;
};
export declare const ROLES: {
    readonly MANAGER: "MANAGER";
    readonly RECEPTION: "RECEPTION";
    readonly TECHNICIAN: "TECHNICIAN";
    readonly CLEANER: "CLEANER";
    readonly MARKETER: "MARKETER";
};
export type Role = (typeof ROLES)[keyof typeof ROLES];
//# sourceMappingURL=constants.d.ts.map