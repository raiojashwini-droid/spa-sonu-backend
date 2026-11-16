"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeServiceSchema = exports.serviceMediaItemSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.serviceMediaItemSchema = zod_1.z.object({
    mediaType: zod_1.z.nativeEnum(client_1.MediaType, { required_error: 'mediaType must be BEFORE or AFTER' }),
    fileUrl: zod_1.z.string({ required_error: 'fileUrl is required' }).min(1, 'fileUrl cannot be empty'),
    note: zod_1.z.string().optional().nullable(),
});
exports.completeServiceSchema = zod_1.z.object({
    notes: zod_1.z.string().optional().nullable(),
    media: zod_1.z.array(exports.serviceMediaItemSchema).optional(),
});
//# sourceMappingURL=serviceCompletion.validation.js.map