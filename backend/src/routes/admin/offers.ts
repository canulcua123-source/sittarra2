import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/ofertas
 * Lista todas las ofertas (activas e inactivas) del restaurante.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { data, error } = await supabaseAdmin
            .from('offers')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('List offers error:', error);
        res.status(500).json({ success: false, error: 'Error al listar ofertas' });
    }
});

/**
 * POST /api/admin/ofertas
 * Crea una nueva oferta promocional.
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const {
            title, description, discount_type, discount_value,
            valid_from, valid_until, promo_code, terms_conditions
        } = req.body;

        const { data, error } = await supabaseAdmin
            .from('offers')
            .insert({
                restaurant_id: restaurantId,
                title,
                description,
                discount_type: discount_type || 'percentage',
                discount_value,
                valid_from: valid_from || new Date().toISOString().split('T')[0],
                valid_until,
                promo_code,
                terms_conditions,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'Oferta creada exitosamente' });
    } catch (error) {
        console.error('Create offer error:', error);
        res.status(500).json({ success: false, error: 'Error al crear la oferta' });
    }
});

/**
 * PATCH /api/admin/ofertas/:id
 * Actualiza el estado o detalles de una oferta.
 */
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;
        const updates = req.body;

        const { data, error } = await supabaseAdmin
            .from('offers')
            .update(updates)
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Oferta actualizada' });
    } catch (error) {
        console.error('Update offer error:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar la oferta' });
    }
});

/**
 * DELETE /api/admin/ofertas/:id
 * Elimina permanentemente una oferta.
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;

        const { error } = await supabaseAdmin
            .from('offers')
            .delete()
            .eq('id', id)
            .eq('restaurant_id', restaurantId);

        if (error) throw error;
        res.json({ success: true, message: 'Oferta eliminada correctamente' });
    } catch (error) {
        console.error('Delete offer error:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar la oferta' });
    }
});

export default router;
