"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const router = (0, express_1.Router)();
// POST /api/v1/auth/login — Strict rate limit: 5 attempts per 15 minutes per IP
router.post('/login', rateLimiter_1.loginLimiter, (req, res, next) => auth_controller_1.authController.login(req, res, next));
// GET /api/v1/auth/me
router.get('/me', authMiddleware_1.authMiddleware, (req, res, next) => auth_controller_1.authController.getCurrentUser(req, res, next));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map