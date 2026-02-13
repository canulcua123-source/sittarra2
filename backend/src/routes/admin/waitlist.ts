import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/waitlist/summary
 * Obtiene un resumen cuantitativo de la lista de espera actual.
 */
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabaseAdmin
            .from('waitlist')
            .select('status')
            .eq('restaurant_id', restaurantId)
            .gte('created_at', today);

        if (error) throw error;

        const summary = {
            waiting: data?.filter(w => w.status === 'waiting').length || 0,
            notified: data?.filter(w => w.status === 'notified').length || 0,
            seated: data?.filter(w => w.status === 'seated').length || 0,
            total: data?.length || 0
        };

        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Waitlist summary error:', error);
        res.status(500).json({ success: false, error: 'Error al cargar resumen de lista de espera' });
    }
});

/**
 * GET /api/admin/waitlist
 * Lista todos los clientes en espera (waiting/notified).
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { data, error } = await supabaseAdmin
            .from('waitlist')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .in('status', ['waiting', 'notified'])
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('List waitlist error:', error);
        res.status(500).json({ success: false, error: 'Error al obtener la lista de espera' });
    }
});

/**
 * POST /api/admin/waitlist
 * Agrega un nuevo cliente a la lista de espera manualmente.
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { name, phone, party_size, notes } = req.body;

        const { data, error } = await supabaseAdmin
            .from('waitlist')
            .insert({
                restaurant_id: restaurantId,
                name,
                phone,
                party_size,
                notes,
                status: 'waiting',
                estimated_wait: 15
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'Cliente agregado a la lista' });
    } catch (error) {
        console.error('Add to waitlist error:', error);
        res.status(500).json({ success: false, error: 'Error al agregar a la lista de espera' });
    }
});

/**
 * PATCH /api/admin/waitlist/:id/atender
 * Marca a un cliente de la lista como atendido y le asigna una mesa.
 */
router.patch('/:id/atender', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;
        const { table_id } = req.body;

        const { data, error } = await supabaseAdmin
            .from('waitlist')
            .update({
                status: 'seated',
                seated_at: new Date().toISOString(),
                table_id
            })
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Cliente atendido y sentado' });
    } catch (error) {
        console.error('Attend waitlist error:', error);
        res.status(500).json({ success: false, error: 'Error al procesar atención de cliente' });
    }
});

export default router;
