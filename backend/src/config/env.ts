import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvConfig {
    // Server
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
    frontendUrl: string;
    allowedOrigins: string[];

    // Supabase
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceRoleKey: string;

    // JWT
    jwtSecret: string;

    // Stripe
    stripeSecretKey: string;
    stripeWebhookSecret: string;

    // Email
    resendApiKey: string;

    // Rate Limiting
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function getEnvVarOptional(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
}

export const env: EnvConfig = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: (process.env.NODE_ENV as EnvConfig['nodeEnv']) || 'development',
    frontendUrl: getEnvVarOptional('FRONTEND_URL', 'http://localhost:8080'),
    allowedOrigins: getEnvVarOptional('ALLOWED_ORIGINS', '*').split(','),

    // Supabase
    supabaseUrl: getEnvVar('SUPABASE_URL'),
    supabaseAnonKey: getEnvVar('SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),

    // JWT
    jwtSecret: getEnvVar('JWT_SECRET', 'development-secret-key'),

    // Stripe
    stripeSecretKey: getEnvVar('STRIPE_SECRET_KEY'),
    stripeWebhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET'),

    // Email
    resendApiKey: getEnvVarOptional('RESEND_API_KEY'),

    // Rate Limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
};

export const isDevelopment = env.nodeEnv === 'development';
export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
