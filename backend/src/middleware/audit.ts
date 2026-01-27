import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export interface AuditOptions {
    action: string;
    entityType: string;
    getEntityId?: (req: Request) => string | undefined;
}

/**
 * Middleware to log sensitive actions to the audit_logs table
 */
export const auditMiddleware = (options: AuditOptions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // We use the 'finish' event to ensure we only log if the request was successful
        // or to capture the final state if needed.
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const userId = (req as any).user?.id;
                    const entityId = options.getEntityId ? options.getEntityId(req) : req.params.id;

                    await supabaseAdmin.from('audit_logs').insert({
                        user_id: userId,
                        action: options.action,
                        entity_type: options.entityType,
                        entity_id: entityId,
                        ip_address: req.ip || req.socket.remoteAddress,
                        user_agent: req.get('user-agent'),
                        new_values: req.method !== 'GET' ? req.body : undefined
                    });
                } catch (error) {
                    console.error('Audit log error:', error);
                }
            }
        });

        next();
    };
};
