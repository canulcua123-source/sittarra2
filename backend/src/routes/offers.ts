import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

/**
 * GET /api/offers
 * Obtiene todas las ofertas activas de todos los restaurantes (Vista Global).
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: offers, error } = await supabase
            .from('offers')
            .select(`
                *,
                restaurants (id, name, image_url, cuisine_type, zone)
            `)
            .eq('is_active', true)
            .gte('valid_until', today)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching global offers:', error);
            res.status(500).json({ success: false, error: 'Error al obtener ofertas globales' });
            return;
        }

        res.json({ success: true, data: offers });
    } catch (error) {
        console.error('Global offers route error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/offers/restaurants/:restaurantId
 * Obtiene las ofertas activas de un restaurante específico (Vista Pública).
 */
router.get('/restaurants/:restaurantId', async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const { data: offers, error } = await supabase
            .from('offers')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .gte('valid_until', today)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching restaurant offers:', error);
            res.status(500).json({ success: false, error: 'Error al obtener ofertas del restaurante' });
            return;
        }

        res.json({ success: true, data: offers || [] });
    } catch (error) {
        console.error('Restaurant offers route error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
