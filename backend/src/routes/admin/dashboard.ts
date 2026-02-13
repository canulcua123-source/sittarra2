import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/dashboard
 * Obtiene estadísticas generales del restaurante para el día actual y mes en curso.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const today = (req.query.date as string) || new Date().toISOString().split('T')[0];

        console.log(`[DASHBOARD DEBUG] Request by User: ${(req as any).user?.email} (${(req as any).user?.role})`);
        console.log(`[DASHBOARD DEBUG] Target RestaurantID: ${restaurantId}`);
        console.log(`[DASHBOARD DEBUG] Query Date (UTC): ${today}`);

        // 1. Reservas de hoy (pendientes, confirmadas, llegaron)
        const { count: reservasHoy, error: errHoy } = await supabaseAdmin
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .eq('date', today)
            .in('status', ['pending', 'confirmed', 'arrived']);

        if (errHoy) {
            console.error('[DASHBOARD ERROR] Error fetching today reservations:', errHoy);
        } else {
            console.log(`[DASHBOARD DEBUG] Reservas Hoy Found: ${reservasHoy}`);
        }

        // 2. Estado de ocupación de mesas
        const { count: mesasOcupadas } = await supabaseAdmin
            .from('tables')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .eq('status', 'occupied');

        // 3. Capacidad total del restaurante
        const { count: totalMesas } = await supabaseAdmin
            .from('tables')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId);

        // 4. Ingresos por anticipos (acumulado del mes actual)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const { data: anticipos } = await supabaseAdmin
            .from('reservations')
            .select('deposit_amount')
            .eq('restaurant_id', restaurantId)
            .eq('deposit_paid', true)
            .gte('created_at', startOfMonth.toISOString());

        const ingresosAnticipos = anticipos?.reduce((sum: number, r: any) => sum + (r.deposit_amount || 0), 0) || 0;

        // 5. Calificación promedio histórica
        const { data: reviews } = await supabaseAdmin
            .from('reviews')
            .select('rating')
            .eq('restaurant_id', restaurantId);

        const calificacionPromedio = reviews?.length
            ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
            : 0;

        // 6. Reservas que requieren atención (pendientes)
        const { count: reservasPendientes } = await supabaseAdmin
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .eq('status', 'pending');

        // 7. Breakdown of today's statuses
        const { data: todayStats } = await supabaseAdmin
            .from('reservations')
            .select('status')
            .eq('restaurant_id', restaurantId)
            .eq('date', today);

        const total_confirmadas = todayStats?.filter(r => r.status === 'confirmed').length || 0;
        const total_pendientes = todayStats?.filter(r => r.status === 'pending').length || 0;
        const total_canceladas = todayStats?.filter(r => r.status === 'cancelled').length || 0;
        const total_no_show = todayStats?.filter(r => r.status === 'no_show').length || 0;

        // Cálculo de porcentaje de ocupación
        const ocupacionActual = totalMesas && totalMesas > 0
            ? Math.round((mesasOcupadas || 0) / totalMesas * 100)
            : 0;

        res.json({
            success: true,
            data: {
                reservas_hoy: reservasHoy || 0,
                reservas_pendientes: reservasPendientes || 0,
                mesas_ocupadas: mesasOcupadas || 0,
                total_mesas: totalMesas || 0,
                ocupacion_actual: ocupacionActual,
                ingresos_anticipos: ingresosAnticipos,
                calificacion_promedio: Math.round(calificacionPromedio * 10) / 10,
                total_reviews: reviews?.length || 0,
                // Status breakdown for today
                stats_today: {
                    confirmed: total_confirmadas,
                    pending: total_pendientes,
                    cancelled: total_canceladas,
                    no_show: total_no_show
                }
            }
        });
    } catch (error) {
        console.error('Dashboard logic error:', error);
        res.status(500).json({ success: false, error: 'Error al cargar estadísticas del dashboard' });
    }
});

export default router;
