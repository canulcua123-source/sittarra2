import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

/**
 * Sittara Observability Engine
 * Centralizes logging, metrics, and audit trails.
 */

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    AUDIT = 'AUDIT'
}

export class Logger {
    /**
     * Structured log to stdout (best practice for containerized/cloud environments)
     */
    static log(level: LogLevel, message: string, context: Record<string, any> = {}) {
        const payload = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...context,
            environment: env.nodeEnv
        };

        // Output to console (structured JSON)
        if (env.nodeEnv === 'production') {
            console.log(JSON.stringify(payload));
        } else {
            // Prettier output for development
            const color = level === LogLevel.ERROR ? '\x1b[31m' : level === LogLevel.WARN ? '\x1b[33m' : '\x1b[32m';
            console.log(`${color}[${level}]\x1b[0m ${message}`, Object.keys(context).length ? context : '');
        }

        // Persistent Audit: If level is AUDIT, we might want to store it in DB
        if (level === LogLevel.AUDIT) {
            this.persistSystemMetric('audit_log', 1, { message, ...context });
        }
    }

    static info(message: string, context?: Record<string, any>) { this.log(LogLevel.INFO, message, context); }
    static warn(message: string, context?: Record<string, any>) { this.log(LogLevel.WARN, message, context); }
    static error(message: string, context?: Record<string, any>) { this.log(LogLevel.ERROR, message, context); }

    /**
     * Persist a metric to the DB for internal analytics
     */
    static async persistSystemMetric(eventType: string, value: number, metadata: Record<string, any> = {}) {
        try {
            const restaurantId = metadata.restaurantId || null;
            delete metadata.restaurantId;

            const { error } = await supabaseAdmin
                .from('system_metrics')
                .insert({
                    restaurant_id: restaurantId,
                    event_type: eventType,
                    value,
                    metadata
                });

            if (error) {
                // Don't crash the app if metrics fail, just log to stderr
                console.error('Failed to persist metric:', error.message);
            }
        } catch (e) {
            console.error('Critical error in persistSystemMetric:', e);
        }
    }
}

/**
 * Middleware to track request latency and errors
 */
export const observabilityMiddleware = (req: any, res: any, next: any) => {
    const start = process.hrtime();

    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6);

        const context = {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            latencyMs: Math.round(timeInMs * 100) / 100,
            ip: req.ip,
            restaurantId: req.user?.restaurantId || null
        };

        if (res.statusCode >= 500) {
            Logger.error(`Request Failed: ${req.method} ${req.originalUrl}`, context);
            Logger.persistSystemMetric('api_error_500', 1, context);
        } else if (res.statusCode >= 400) {
            Logger.warn(`Request Warning: ${req.method} ${req.originalUrl}`, context);
            Logger.persistSystemMetric('api_warning_400', 1, context);
        } else {
            // Collect latency metric for successful requests
            Logger.persistSystemMetric('api_latency_ms', timeInMs, context);
        }
    });

    next();
};
