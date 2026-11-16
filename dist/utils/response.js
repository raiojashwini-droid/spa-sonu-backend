"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const constants_1 = require("../config/constants");
/**
 * Standard success response helper.
 * Matches the API specification format:
 * { "success": true, "data": {} }
 */
const sendSuccess = (res, data = {}, statusCode = constants_1.HTTP_STATUS.OK, message) => {
    res.status(statusCode).json({
        success: true,
        ...(message && { message }),
        data,
    });
};
exports.sendSuccess = sendSuccess;
/**
 * Standard error response helper.
 * Matches the API specification format:
 * { "success": false, "message": "Error message", "errors": [] }
 */
const sendError = (res, message = 'Internal Server Error', statusCode = constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = []) => {
    res.status(statusCode).json({
        success: false,
        message,
        errors,
    });
};
exports.sendError = sendError;
//# sourceMappingURL=response.js.map