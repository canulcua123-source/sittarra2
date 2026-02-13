import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/menu
 * Obtiene todos los platillos del restaurante agrupados por categoría.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;

        const { data, error } = await supabaseAdmin
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('category', { ascending: true })
            .order('sort_order', { ascending: true });

        if (error) throw error;

        // Agrupación reactiva por categoría para facilitar el consumo del frontend
        const menuByCategory = data?.reduce((acc: any, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});

        res.json({ success: true, data, grouped: menuByCategory });
    } catch (error) {
        console.error('Menu list error:', error);
        res.status(500).json({ success: false, error: 'Error al cargar el menú' });
    }
});

/**
 * POST /api/admin/menu
 * Agrega un nuevo platillo al catálogo del restaurante.
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const {
            name, description, price, category,
            image_url, is_highlighted, is_vegetarian, is_vegan,
            is_gluten_free, is_spicy, spicy_level, is_new
        } = req.body;

        const { data, error } = await supabaseAdmin
            .from('menu_items')
            .insert({
                restaurant_id: restaurantId,
                name,
                description,
                price,
                category,
                image_url,
                is_highlighted: !!is_highlighted,
                is_vegetarian: !!is_vegetarian,
                is_vegan: !!is_vegan,
                is_gluten_free: !!is_gluten_free,
                is_spicy: !!is_spicy,
                spicy_level: Number(spicy_level) || 0,
                is_new: !!is_new,
                is_available: true
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'Platillo agregado exitosamente' });
    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ success: false, error: 'Error al agregar platillo' });
    }
});

/**
 * PATCH /api/admin/menu/:id
 * Actualiza la información o disponibilidad de un platillo.
 */
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;
        const updates = req.body;

        const { data, error } = await supabaseAdmin
            .from('menu_items')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Platillo actualizado correctamente' });
    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar platillo' });
    }
});

/**
 * DELETE /api/admin/menu/:id
 * Elimina un platillo del menú.
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;

        const { error } = await supabaseAdmin
            .from('menu_items')
            .delete()
            .eq('id', id)
            .eq('restaurant_id', restaurantId);

        if (error) throw error;
        res.json({ success: true, message: 'Platillo eliminado correctamente' });
    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar platillo' });
    }
});

export default router;
