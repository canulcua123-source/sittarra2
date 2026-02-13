import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { Logger } from '../services/observability.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Mesa Feliz API is running' });
});

/**
 * Health & Readiness Check
 * Used by load balancers and monitoring tools.
 */

router.get('/live', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req: Request, res: Response) => {
    const checks: Record<string, any> = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    };

    let isReady = true;

    try {
        // 1. Verify Database Connection
        const start = Date.now();
        const { error } = await supabaseAdmin.from('restaurants').select('id').limit(1);
        checks.database = {
            status: error ? 'error' : 'ok',
            latency: `${Date.now() - start}ms`
        };
        if (error) isReady = false;

    } catch (e: any) {
        checks.database = { status: 'error', message: e.message };
        isReady = false;
    }

    if (!isReady) {
        Logger.error('Health Check Failed', checks);
        return res.status(503).json({ status: 'unhealthy', ...checks });
    }

    res.json({ status: 'healthy', ...checks });
});

export default router;
