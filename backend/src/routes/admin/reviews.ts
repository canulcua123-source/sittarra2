import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/reviews
 * Lista todas las reseñas del restaurante con información del usuario.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select(`
                *,
                users:user_id (name, avatar_url)
            `)
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Reviews list error:', error);
        res.status(500).json({ success: false, error: 'Error al cargar las opiniones' });
    }
});

/**
 * POST /api/admin/reviews/:id/respuesta
 * Permite al administrador responder a la reseña de un cliente.
 */
router.post('/:id/respuesta', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;
        const userId = (req as any).user?.id;
        const { response } = req.body;

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .update({
                response,
                responded_at: new Date().toISOString(),
                responded_by: userId
            })
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Respuesta publicada exitosamente' });
    } catch (error) {
        console.error('Reply review error:', error);
        res.status(500).json({ success: false, error: 'Error al publicar la respuesta' });
    }
});

export default router;
