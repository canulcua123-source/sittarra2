import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/mesas
 * Lista todas las mesas registradas del restaurante.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { data: mesas, error } = await supabaseAdmin
            .from('tables')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('number', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data: mesas });
    } catch (error) {
        console.error('List tables error:', error);
        res.status(500).json({ success: false, error: 'Error al listar las mesas' });
    }
});

/**
 * POST /api/admin/mesas
 * Crea una nueva mesa. Valida tipos de datos y asigna el restaurante del admin.
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { number, capacity, shape, position_x, position_y, zone, is_vip } = req.body;

        const { data, error } = await supabaseAdmin
            .from('tables')
            .insert({
                restaurant_id: restaurantId,
                number,
                capacity: Number(capacity),
                shape: shape || 'round',
                position_x: Number(position_x) || 0,
                position_y: Number(position_y) || 0,
                zone: zone || 'main',
                is_vip: !!is_vip,
                status: 'available'
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'Mesa creada exitosamente' });
    } catch (error) {
        console.error('Create table error:', error);
        res.status(500).json({ success: false, error: 'Error al crear la mesa' });
    }
});

/**
 * PATCH /api/admin/mesas/:id
 * Actualiza propiedades o estado de una mesa específica.
 */
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;
        const updates = req.body;

        const { data, error } = await supabaseAdmin
            .from('tables')
            .update(updates)
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Mesa actualizada correctamente' });
    } catch (error) {
        console.error('Update table error:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar la mesa' });
    }
});

/**
 * DELETE /api/admin/mesas/:id
 * Elimina una mesa asegurando que pertenezca al restaurante gestionado.
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;

        const { error } = await supabaseAdmin
            .from('tables')
            .delete()
            .eq('id', id)
            .eq('restaurant_id', restaurantId);

        if (error) throw error;
        res.json({ success: true, message: 'Mesa eliminada correctamente' });
    } catch (error) {
        console.error('Delete table error:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar la mesa' });
    }
});

export default router;
