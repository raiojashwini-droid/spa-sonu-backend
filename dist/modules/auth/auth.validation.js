"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string({ required_error: 'Email is required' }).min(1, 'Email is required'),
    password: zod_1.z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});
//# sourceMappingURL=auth.validation.js.map