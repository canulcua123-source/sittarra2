import { supabaseAdmin } from '../config/supabase.js';
import { Logger } from './observability.js';

/**
 * Sittara Feature Flag Engine
 * Allows controlled rollouts and runtime configuration.
 */

export class FeatureFlagService {
    private static cache: Map<string, { enabled: boolean, timestamp: number }> = new Map();
    private static CACHE_TTL = 60000; // 1 minute in-memory cache

    /**
     * Check if a feature is enabled
     * @param key The flag key
     * @param restaurantId Optional restaurantId for per-tenant flags
     */
    static async isEnabled(key: string, restaurantId?: string): Promise<boolean> {
        const cacheKey = `${restaurantId || 'global'}:${key}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.enabled;
        }

        try {
            // Priority 1: Check restaurant-specific flag
            if (restaurantId) {
                const { data: resFlag } = await supabaseAdmin
                    .from('feature_flags')
                    .select('is_enabled')
                    .eq('restaurant_id', restaurantId)
                    .eq('key', key)
                    .maybeSingle();

                if (resFlag !== null) {
                    this.updateCache(cacheKey, resFlag.is_enabled);
                    return resFlag.is_enabled;
                }
            }

            // Priority 2: Check global flag (restaurant_id IS NULL)
            const { data: globalFlag } = await supabaseAdmin
                .from('feature_flags')
                .select('is_enabled')
                .is('restaurant_id', null)
                .eq('key', key)
                .maybeSingle();

            const enabled = globalFlag?.is_enabled || false;
            this.updateCache(cacheKey, enabled);
            return enabled;

        } catch (error) {
            Logger.error(`Error checking feature flag ${key}:`, { error });
            return false; // Fail safe (disabled)
        }
    }

    private static updateCache(key: string, enabled: boolean) {
        this.cache.set(key, { enabled, timestamp: Date.now() });
    }

    /**
     * Clear cache (useful after admin updates)
     */
    static clearCache() {
        this.cache.clear();
    }
}
