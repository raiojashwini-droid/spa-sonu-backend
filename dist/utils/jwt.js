"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const generateToken = (payload, expiresIn = '24h') => {
    const secret = env_1.env.JWT_SECRET || 'omega-spa-dev-secret-change-in-production';
    const options = {
        expiresIn: expiresIn,
    };
    return jsonwebtoken_1.default.sign(payload, secret, options);
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    const secret = env_1.env.JWT_SECRET || 'omega-spa-dev-secret-change-in-production';
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.js.map