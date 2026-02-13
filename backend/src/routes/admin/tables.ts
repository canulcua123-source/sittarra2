import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { TableStatusService } from '../../services/tableStatus.js';
import crypto from 'crypto';


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
 * GET /api/admin/mesas/estado
 * Obtiene un reporte detallado del estado lógico y ocupación de todas las mesas en tiempo real.
 */
router.get('/estado', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        if (!restaurantId) {
            return res.status(400).json({ success: false, error: 'Contexto de restaurante no encontrado' });
        }

        const report = await TableStatusService.getRestaurantStatusReport(restaurantId);
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Table status report error:', error);
        res.status(500).json({ success: false, error: 'Error al obtener el estado de las mesas' });
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
                is_active: true, // IMPORTANTE: Asegura que la mesa aparezca en /tables/available
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

        // --- BUG FIX: Sync table status change with reservation completion ---
        if (updates.status === 'available') {
            try {
                console.log(`[DEBUG] Attempting to free table ID: ${id}`);

                // Find active reservation for this table
                const { data: activeRes, error: findError } = await supabaseAdmin
                    .from('reservations')
                    .select('id, user_id, restaurants(name)')
                    .eq('table_id', id)
                    .in('status', ['confirmed', 'arrived', 'seated'])
                    .maybeSingle();

                if (findError) {
                    console.error('[DEBUG] Error finding active reservation:', findError);
                }

                if (activeRes) {
                    console.log(`[DEBUG] Found active reservation ${activeRes.id}. Marking as completed...`);
                    // Mark reservation as completed
                    const { error: updateError } = await supabaseAdmin
                        .from('reservations')
                        .update({
                            status: 'completed',
                            completed_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', activeRes.id);

                    if (updateError) {
                        console.error('[DEBUG] Error updating reservation status:', updateError);
                    } else {
                        console.log(`[DEBUG] Successfully marked reservation ${activeRes.id} as completed`);
                    }

                    // Trigger Automated Review Request (Mobile signal)
                    try {
                        const { NotificationService } = await import('../../services/notifications.js');
                        const restaurantName = (activeRes as any).restaurants?.name || 'el restaurante';
                        await NotificationService.requestReview(
                            activeRes.user_id,
                            activeRes.id,
                            restaurantName
                        );
                        console.log(`[ADMIN_ACTION] Triggered review request for user ${activeRes.user_id}`);
                    } catch (notificationError) {
                        console.error('[ADMIN_ACTION] Failed to trigger review request:', notificationError);
                    }
                } else {
                    console.log(`[DEBUG] No active reservation found for table ${id}`);
                }
            } catch (syncError) {
                console.error('[ADMIN_ACTION] Error syncing table status with reservation:', syncError);
            }
        }
        // ----------------------------------------------------------------------

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

/**
 * POST /api/admin/mesas/:id/walk-in
 * Asigna una mesa a un cliente que llega sin reserva previa.
 * Crea una reserva instantánea marcada como 'seated' y 'walk_in'.
 */
router.post('/:id/walk-in', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;
        const { guestCount, name, phone } = req.body;

        if (!guestCount) {
            return res.status(400).json({ success: false, error: 'El número de personas es obligatorio' });
        }

        // 1. Validar disponibilidad real
        const report = await TableStatusService.getRestaurantStatusReport(restaurantId);
        const tableStatus = report.find(t => t.tableId === id);

        if (!tableStatus) {
            return res.status(404).json({ success: false, error: 'Mesa no encontrada' });
        }

        if (tableStatus.logicalStatus !== 'FREE' && tableStatus.logicalStatus !== 'NEXT_RESERVATION') {
            return res.status(409).json({
                success: false,
                error: `La mesa no está disponible para walk-in (Estado: ${tableStatus.logicalStatus})`
            });
        }

        // Si hay una reserva próxima, validar que el walk-in no la choque
        if (tableStatus.nextReservation) {
            const timeUntilNext = tableStatus.remainingTimeMinutes || 0;
            if (timeUntilNext < 60) { // Regla: Al menos 60 min libres para un walk-in
                return res.status(409).json({
                    success: false,
                    error: `La mesa tiene una reserva en ${timeUntilNext} minutos. No hay tiempo suficiente.`
                });
            }
        }

        // 2. Buscar o crear un usuario "Anónimo/Walk-in"
        // Para simplificar, asociaremos el walk-in al ID del admin que lo registra
        // o crearemos un registro genérico. Aquí usaremos el admin actual.
        const userId = (req as any).user.id;

        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        const today = now.toISOString().split('T')[0];

        // Calcular end_time estimado (90 mins)
        const endTimeDate = new Date(now.getTime() + 90 * 60000);
        const endTime = endTimeDate.toTimeString().split(' ')[0];

        const qrCode = `WI-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

        // 3. Crear Reservación Instantánea
        const { data: reservation, error: resError } = await supabaseAdmin
            .from('reservations')
            .insert({
                restaurant_id: restaurantId,
                user_id: userId,
                table_id: id,
                date: today,
                time: currentTime,
                end_time: endTime,
                guest_count: Number(guestCount),
                status: 'seated',
                source: 'walk_in',
                seated_at: now.toISOString(),
                qr_code: qrCode,
                internal_notes: `Walk-in registrado para: ${name || 'Sin nombre'} (${phone || 'Sin tel'})`
            })
            .select()
            .single();

        if (resError) throw resError;

        // 4. Actualizar estado físico de la mesa
        await supabaseAdmin
            .from('tables')
            .update({ status: 'occupied' })
            .eq('id', id);

        res.status(201).json({
            success: true,
            data: reservation,
            message: 'Walk-in registrado y mesa ocupada con éxito'
        });
    } catch (error) {
        console.error('Walk-in assignment error:', error);
        res.status(500).json({ success: false, error: 'Error al registrar el walk-in' });
    }
});


export default router;
