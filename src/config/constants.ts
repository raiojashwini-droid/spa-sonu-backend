/**
 * OMEGA SPA POS — Application Constants
 *
 * Centralized constant values used across the backend.
 * Business-specific constants will be added in later phases.
 */

export const APP_NAME = 'OMEGA SPA POS';
export const APP_TIMEZONE = 'Africa/Douala';

export const API_PREFIX = '/api/v1';

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ROLES = {
  MANAGER: 'MANAGER',
  RECEPTION: 'RECEPTION',
  TECHNICIAN: 'TECHNICIAN',
  CLEANER: 'CLEANER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
