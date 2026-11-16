"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function getEnvVariable(key, required = true) {
    const value = process.env[key];
    if (required && (!value || value.trim() === '')) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || '';
}
exports.env = {
    PORT: parseInt(getEnvVariable('PORT', false) || '5000', 10),
    DATABASE_URL: getEnvVariable('DATABASE_URL', false),
    JWT_SECRET: getEnvVariable('JWT_SECRET', false) || 'dev-fallback-secret',
    NODE_ENV: (getEnvVariable('NODE_ENV', false) || 'development'),
    CLOUDINARY_CLOUD_NAME: getEnvVariable('CLOUDINARY_CLOUD_NAME', false),
    CLOUDINARY_API_KEY: getEnvVariable('CLOUDINARY_API_KEY', false),
    CLOUDINARY_API_SECRET: getEnvVariable('CLOUDINARY_API_SECRET', false),
    WHATSAPP_PHONE_NUMBER_ID: getEnvVariable('WHATSAPP_PHONE_NUMBER_ID', false),
    WHATSAPP_ACCESS_TOKEN: getEnvVariable('WHATSAPP_ACCESS_TOKEN', false),
    WHATSAPP_BUSINESS_ACCOUNT_ID: getEnvVariable('WHATSAPP_BUSINESS_ACCOUNT_ID', false),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: getEnvVariable('WHATSAPP_WEBHOOK_VERIFY_TOKEN', false),
    CORS_ORIGIN: getEnvVariable('CORS_ORIGIN', false),
    META_PAGE_ACCESS_TOKEN: getEnvVariable('META_PAGE_ACCESS_TOKEN', false),
    META_PAGE_ID: getEnvVariable('META_PAGE_ID', false),
    INSTAGRAM_ACCOUNT_ID: getEnvVariable('INSTAGRAM_ACCOUNT_ID', false),
    TIKTOK_ACCESS_TOKEN: getEnvVariable('TIKTOK_ACCESS_TOKEN', false),
    TIKTOK_BUSINESS_ID: getEnvVariable('TIKTOK_BUSINESS_ID', false),
    OPENAI_API_KEY: getEnvVariable('OPENAI_API_KEY', false),
    OPENAI_MODEL: getEnvVariable('OPENAI_MODEL', false) || 'gpt-4o-mini',
};
// Production readiness checks
if (exports.env.NODE_ENV === 'production') {
    if (!exports.env.DATABASE_URL || exports.env.DATABASE_URL.trim() === '') {
        throw new Error('CRITICAL: DATABASE_URL must be specified in production environment');
    }
    if (!exports.env.JWT_SECRET || exports.env.JWT_SECRET === 'dev-fallback-secret' || exports.env.JWT_SECRET.length < 16) {
        throw new Error('CRITICAL: Secure JWT_SECRET (minimum 16 characters) must be configured in production');
    }
    if (!exports.env.CLOUDINARY_CLOUD_NAME || !exports.env.CLOUDINARY_API_KEY || !exports.env.CLOUDINARY_API_SECRET) {
        throw new Error('CRITICAL: Cloudinary credentials must be configured in production');
    }
}
if (isNaN(exports.env.PORT) || exports.env.PORT <= 0 || exports.env.PORT > 65535) {
    throw new Error(`Invalid PORT configuration: ${exports.env.PORT}`);
}
//# sourceMappingURL=env.js.map