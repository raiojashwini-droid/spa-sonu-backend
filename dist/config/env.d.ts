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
    OPENAI_API_KEY: string;
    OPENAI_MODEL: string;
}
export declare const env: EnvConfig;
export {};
//# sourceMappingURL=env.d.ts.map