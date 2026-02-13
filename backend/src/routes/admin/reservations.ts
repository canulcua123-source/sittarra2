import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/reservas
 * Lista reservas con filtros por fecha y estado. Incluye datos de usuario y mesa.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { fecha, status, limit = 50, offset = 0 } = req.query;

        let query = supabaseAdmin
            .from('reservations')
            .select(`
                *,
                users:user_id (name, email, phone),
                tables:table_id (number, capacity)
            `, { count: 'exact' })
            .eq('restaurant_id', restaurantId)
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        // Filtros dinámicos
        if (fecha === 'hoy') {
            query = query.eq('date', new Date().toISOString().split('T')[0]);
        } else if (fecha === 'manana') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query.eq('date', tomorrow.toISOString().split('T')[0]);
        } else if (fecha && typeof fecha === 'string') {
            query = query.eq('date', fecha);
        }

        if (status && typeof status === 'string') {
            query = query.eq('status', status);
        }

        // Paginación
        query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

        const { data: reservas, error, count } = await query;
        if (error) throw error;

        res.json({
            success: true,
            data: reservas,
            total: count,
            limit: Number(limit),
            offset: Number(offset)
        });
    } catch (error) {
        console.error('List reservations error:', error);
        res.status(500).json({ success: false, error: 'Error al listar reservaciones' });
    }
});

/**
 * PATCH /api/admin/reservas/:id/aceptar
 * Confirma una reserva y reserva la mesa asociada.
 */
router.patch('/:id/aceptar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;

        // Update reservation status
        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({ status: 'confirmed', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select(`
                *,
                users:user_id (id, name, email, phone)
            `)
            .single();

        if (error) throw error;

        // Update table status if assigned
        if (data?.table_id) {
            await supabaseAdmin
                .from('tables')
                .update({ status: 'reserved' })
                .eq('id', data.table_id);
        }

        // Send email notification to user
        if (data?.users?.email) {
            try {
                const { sendReservationConfirmation } = await import('../../services/email.js');
                await sendReservationConfirmation(data.users.email, {
                    date: data.date,
                    time: data.time,
                    guestCount: data.guest_count,
                    tableId: data.table_id,
                    qrCode: data.qr_code
                });
                console.log(`[NOTIFICATION] Confirmation email sent to ${data.users.email}`);
            } catch (emailError) {
                console.error('[NOTIFICATION] Failed to send confirmation email:', emailError);
                // Don't fail the request if email fails
            }
        }

        res.json({ success: true, data, message: 'Reserva confirmada exitosamente' });
    } catch (error) {
        console.error('Accept reservation error:', error);
        res.status(500).json({ success: false, error: 'Error al confirmar la reserva' });
    }
});

/**
 * PATCH /api/admin/reservas/:id/cancelar
 * Cancela una reserva y libera la mesa.
 */
router.patch('/:id/cancelar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;
        const { reason } = req.body;

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason || 'Cancelada por el restaurante',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select()
            .single();

        if (error) throw error;

        if (data?.table_id) {
            await supabaseAdmin
                .from('tables')
                .update({ status: 'available' })
                .eq('id', data.table_id);
        }

        res.json({ success: true, data, message: 'Reserva cancelada exitosamente' });
    } catch (error) {
        console.error('Cancel reservation error:', error);
        res.status(500).json({ success: false, error: 'Error al cancelar la reserva' });
    }
});

/**
 * PATCH /api/admin/reservas/:id/checkin
 * Registra la llegada del cliente y marca la mesa como ocupada.
 */
router.patch('/:id/checkin', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({
                status: 'arrived',
                arrived_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select()
            .single();

        if (error) throw error;

        if (data?.table_id) {
            await supabaseAdmin
                .from('tables')
                .update({ status: 'occupied' })
                .eq('id', data.table_id);
        }

        res.json({ success: true, data, message: 'Llegada registrada exitosamente' });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, error: 'Error al registrar la llegada' });
    }
});

/**
 * PATCH /api/admin/reservas/:id/sentar
 * Marca al cliente como ya sentado en la mesa.
 */
router.patch('/:id/sentar', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;

        const { data, error } = await supabaseAdmin
            .from('reservations')
            .update({
                status: 'seated',
                seated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select()
            .single();

        if (error) throw error;

        if (data?.table_id) {
            await supabaseAdmin
                .from('tables')
                .update({ status: 'occupied' })
                .eq('id', data.table_id);
        }

        res.json({ success: true, data, message: 'Cliente sentado y mesa ocupada' });
    } catch (error) {
        console.error('Seat guest error:', error);
        res.status(500).json({ success: false, error: 'Error al sentar al cliente' });
    }
});


export default router;
