import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_BUSINESS_ACCOUNT_ID: string;
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: string;
  CORS_ORIGIN: string;
  META_PAGE_ACCESS_TOKEN: string;
  META_PAGE_ID: string;
  INSTAGRAM_ACCOUNT_ID: string;
  TIKTOK_ACCESS_TOKEN: string;
  TIKTOK_BUSINESS_ID: string;
}

function getEnvVariable(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (required && (!value || value.trim() === '')) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const env: EnvConfig = {
  PORT: parseInt(getEnvVariable('PORT', false) || '5000', 10),
  DATABASE_URL: getEnvVariable('DATABASE_URL', false),
  JWT_SECRET: getEnvVariable('JWT_SECRET', false) || 'dev-fallback-secret',
  NODE_ENV: (getEnvVariable('NODE_ENV', false) || 'development') as EnvConfig['NODE_ENV'],
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
};

// Production readiness checks
if (env.NODE_ENV === 'production') {
  if (!env.DATABASE_URL || env.DATABASE_URL.trim() === '') {
    throw new Error('CRITICAL: DATABASE_URL must be specified in production environment');
  }
  if (!env.JWT_SECRET || env.JWT_SECRET === 'dev-fallback-secret' || env.JWT_SECRET.length < 16) {
    throw new Error('CRITICAL: Secure JWT_SECRET (minimum 16 characters) must be configured in production');
  }
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('CRITICAL: Cloudinary credentials must be configured in production');
  }
}

if (isNaN(env.PORT) || env.PORT <= 0 || env.PORT > 65535) {
  throw new Error(`Invalid PORT configuration: ${env.PORT}`);
}

