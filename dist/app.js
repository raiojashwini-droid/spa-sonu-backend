"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const clients_routes_1 = __importDefault(require("./modules/clients/clients.routes"));
const appointments_routes_1 = __importDefault(require("./modules/appointments/appointments.routes"));
const serviceCompletion_routes_1 = __importDefault(require("./modules/service-completion/serviceCompletion.routes"));
const invoices_routes_1 = __importDefault(require("./modules/invoices/invoices.routes"));
const payments_routes_1 = __importDefault(require("./modules/payments/payments.routes"));
const stock_routes_1 = __importDefault(require("./modules/stock/stock.routes"));
const commissions_routes_1 = __importDefault(require("./modules/commissions/commissions.routes"));
const loyalty_routes_1 = __importStar(require("./modules/loyalty/loyalty.routes"));
const reports_routes_1 = __importDefault(require("./modules/reports/reports.routes"));
const whatsapp_routes_1 = __importDefault(require("./modules/whatsapp/whatsapp.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const specialties_routes_1 = __importDefault(require("./modules/specialties/specialties.routes"));
const services_routes_1 = __importDefault(require("./modules/services/services.routes"));
const expenses_routes_1 = __importDefault(require("./modules/expenses/expenses.routes"));
const uploads_routes_1 = __importDefault(require("./modules/uploads/uploads.routes"));
const media_routes_1 = __importDefault(require("./modules/media/media.routes"));
const attendance_routes_1 = __importDefault(require("./modules/attendance/attendance.routes"));
const social_routes_1 = __importDefault(require("./modules/social/social.routes"));
const feedback_routes_1 = require("./modules/feedback/feedback.routes");
const penalties_routes_1 = __importDefault(require("./modules/penalties/penalties.routes"));
const job_seekers_routes_1 = __importDefault(require("./modules/job-seekers/job-seekers.routes"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// ==================================================
// Security & Parsing Middleware (CORS Configuration)
// ==================================================
const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
    'https://omega-spa-pos.netlify.app',
    'http://omega-spa-pos.netlify.app',
];
const envAllowedOrigins = env_1.env.CORS_ORIGIN
    ? env_1.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, postman)
        if (!origin)
            return callback(null, true);
        // Check if origin is allowed (localhost, 127.0.0.1, Netlify, Railway, or explicitly in allowed list)
        const isAllowed = env_1.env.NODE_ENV === 'development' ||
            allowedOrigins.includes(origin) ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin.endsWith('.netlify.app') ||
            origin.endsWith('.up.railway.app');
        if (isAllowed) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Disposition'],
    optionsSuccessStatus: 200,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static uploads serving
app.use('/uploads', express_1.default.static(path_1.default.resolve(__dirname, '../../uploads')));
// ==================================================
// Request Logging
// ==================================================
if (env_1.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// ==================================================
// Health Check Endpoint
// ==================================================
app.get('/', (_req, res) => {
    res.status(200).json({
        message: 'OMEGA SPA POS Backend Running',
        version: '1.2.9',
        build: '2026-10-28-dailyclose-resilience-v1.2.9',
        retentionReady: true,
    });
});
// ==================================================
// API Routes (Mounted strictly under /api/v1)
// ==================================================
// Apply general rate limiting to all API routes (100 req/min per IP)
app.use('/api/v1', rateLimiter_1.apiLimiter);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/users', users_routes_1.default);
app.use('/api/v1/specialties', specialties_routes_1.default);
app.use('/api/v1/services', services_routes_1.default);
app.use('/api/v1/clients', clients_routes_1.default);
app.use('/api/v1/appointments', appointments_routes_1.default);
app.use('/api/v1/service-completion', serviceCompletion_routes_1.default);
app.use('/api/v1/invoices', invoices_routes_1.default);
app.use('/api/v1/payments', payments_routes_1.default);
app.use('/api/v1/stock', stock_routes_1.default);
app.use('/api/v1/commissions', commissions_routes_1.default);
app.use('/api/v1/loyalty', loyalty_routes_1.default);
app.use('/api/v1/rebooking', loyalty_routes_1.rebookingRouter);
app.use('/api/v1/reports', reports_routes_1.default);
app.use('/api/v1/whatsapp', whatsapp_routes_1.default);
app.use('/api/v1/expenses', expenses_routes_1.default);
app.use('/api/v1/uploads', uploads_routes_1.default);
app.use('/api/v1/media', media_routes_1.default);
app.use('/api/v1/attendance', attendance_routes_1.default);
app.use('/api/v1/social', social_routes_1.default);
app.use('/api/v1/public/feedback', feedback_routes_1.publicFeedbackRouter);
app.use('/api/v1/client-feedback', feedback_routes_1.clientFeedbackRouter);
app.use('/api/v1/feedback', feedback_routes_1.feedbackRouter);
app.use('/api/v1/penalties', penalties_routes_1.default);
app.use('/api/v1/job-seekers', job_seekers_routes_1.default);
// ==================================================
// Error Handling Middleware
// ==================================================
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map