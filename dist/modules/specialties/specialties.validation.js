"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSpecialtySchema = exports.createSpecialtySchema = void 0;
const zod_1 = require("zod");
exports.createSpecialtySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Specialty name is required'),
    isActive: zod_1.z.boolean().optional(),
    active: zod_1.z.boolean().optional(),
});
exports.updateSpecialtySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Specialty name cannot be empty').optional(),
    isActive: zod_1.z.boolean().optional(),
    active: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=specialties.validation.js.map