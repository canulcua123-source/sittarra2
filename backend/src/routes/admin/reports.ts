import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/reports
 * Genera datos estadísticos sobre reservas, ocupación e ingresos estimados.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { period = 'month' } = req.query;

        const now = new Date();
        const startDate = new Date();

        if (period === 'week') startDate.setDate(now.getDate() - 7);
        else if (period === 'quarter') startDate.setMonth(now.getMonth() - 3);
        else startDate.setMonth(now.getMonth() - 1);

        // 1. Capacidad total instalada
        const { data: tables } = await supabaseAdmin
            .from('tables')
            .select('capacity')
            .eq('restaurant_id', restaurantId);

        const totalCapacity = tables?.reduce((sum: number, t: any) => sum + (t.capacity || 0), 0) || 100;

        // 2. Extracción de reservaciones en el rango
        const { data: reservations, error } = await supabaseAdmin
            .from('reservations')
            .select('date, guest_count, status, deposit_amount, deposit_paid')
            .eq('restaurant_id', restaurantId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', now.toISOString().split('T')[0]);

        if (error) throw error;

        // 3. Procesamiento por día (Serie de tiempo)
        const daysMap = new Map<string, { reservations: number; guests: number; revenue: number }>();
        const loopDate = new Date(startDate);
        while (loopDate <= now) {
            const dateStr = loopDate.toISOString().split('T')[0];
            daysMap.set(dateStr, { reservations: 0, guests: 0, revenue: 0 });
            loopDate.setDate(loopDate.getDate() + 1);
        }

        reservations?.forEach((r: any) => {
            if (daysMap.has(r.date)) {
                const day = daysMap.get(r.date)!;
                day.reservations++;
                if (r.status !== 'cancelled' && r.status !== 'no_show') {
                    day.guests += r.guest_count || 0;
                    const deposit = r.deposit_paid ? (r.deposit_amount || 0) : 0;
                    const estimatedSpend = (r.guest_count || 2) * 350; // Constante de gasto promedio
                    day.revenue += deposit + estimatedSpend;
                }
            }
        });

        const reportData = Array.from(daysMap.entries()).map(([date, stats]) => {
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('es-MX', { weekday: 'short' });
            return {
                day: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateObj.getDate()}`,
                date,
                reservations: stats.reservations,
                occupancy: Math.min(Math.round((stats.guests / totalCapacity) * 100), 100),
                revenue: stats.revenue
            };
        });

        res.json({ success: true, data: reportData });
    } catch (error) {
        console.error('Reports generation error:', error);
        res.status(500).json({ success: false, error: 'Error al generar los reportes de rendimiento' });
    }
});

export default router;
