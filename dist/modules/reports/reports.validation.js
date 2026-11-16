"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.technicianReportQuerySchema = exports.topServicesQuerySchema = exports.dateRangeQuerySchema = void 0;
const zod_1 = require("zod");
exports.dateRangeQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['today', 'weekly', 'monthly', 'custom', '7d', '30d']).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
exports.topServicesQuerySchema = exports.dateRangeQuerySchema.extend({
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
});
exports.technicianReportQuerySchema = exports.dateRangeQuerySchema.extend({
    technicianId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=reports.validation.js.map