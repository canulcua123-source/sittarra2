import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { FeatureFlagService } from '../../services/featureFlag.js';
import { Logger } from '../../services/observability.js';

const router = Router();

/**
 * GET /api/admin/config/flags
 * List all flags for the restaurant (including global ones)
 */
router.get('/flags', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;

        const { data: flags, error } = await supabaseAdmin
            .from('feature_flags')
            .select('*')
            .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`)
            .order('key', { ascending: true });

        if (error) throw error;

        res.json({ success: true, data: flags });
    } catch (error) {
        console.error('List flags error:', error);
        res.status(500).json({ success: false, error: 'Error al cargar feature flags' });
    }
});

/**
 * POST /api/admin/config/flags
 * Create or update a flag
 */
router.post('/flags', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { key, isEnabled, description, isGlobal } = req.body;

        if (!key) {
            return res.status(400).json({ success: false, error: 'Key is required' });
        }

        const targetRestaurantId = isGlobal ? null : restaurantId;

        const { data, error } = await supabaseAdmin
            .from('feature_flags')
            .upsert({
                restaurant_id: targetRestaurantId,
                key,
                is_enabled: isEnabled,
                description,
                updated_at: new Date().toISOString()
            }, { onConflict: 'restaurant_id, key' })
            .select()
            .single();

        if (error) throw error;

        // Clear cache to reflect changes immediately
        FeatureFlagService.clearCache();

        Logger.info(`Feature flag updated: ${key}`, {
            key,
            isEnabled,
            restaurantId: targetRestaurantId,
            adminId: (req as any).user?.id
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Update flag error:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar feature flag' });
    }
});

export default router;
