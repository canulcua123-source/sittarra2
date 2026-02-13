import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { authMiddleware, restaurantOwnerMiddleware } from '../../middleware/auth.js';

const router = Router();

/**
 * GET /api/admin/analytics/overview
 * Get high-level analytics for the restaurant
 */
router.get('/overview', authMiddleware, async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId || req.query.restaurantId;
        const { startDate, endDate } = req.query;

        if (!restaurantId) {
            return res.status(400).json({ success: false, error: 'restaurantId is required' });
        }

        // Default range: last 30 days
        const end = endDate ? new Date(endDate as string) : new Date();
        const start = startDate ? new Date(startDate as string) : new Date();
        if (!startDate) start.setDate(end.getDate() - 30);

        const startISO = start.toISOString().split('T')[0];
        const endISO = end.toISOString().split('T')[0];

        // 1. Reservations Metrics
        const { data: reservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('status, guest_count, date')
            .eq('restaurant_id', restaurantId)
            .gte('date', startISO)
            .lte('date', endISO);

        if (resError) throw resError;

        const total = reservations?.length || 0;
        const completed = reservations?.filter(r => r.status === 'completed').length || 0;
        const noShows = reservations?.filter(r => r.status === 'no_show').length || 0;
        const cancelled = reservations?.filter(r => r.status === 'cancelled').length || 0;

        const occupancyRate = total > 0 ? (completed / total) * 100 : 0;
        const noShowRate = total > 0 ? (noShows / total) * 100 : 0;

        // 2. Promo Usage
        const { data: redemptions, error: promoError } = await supabaseAdmin
            .from('offer_redemptions')
            .select('id, discount_applied')
            .eq('reservation_id', restaurantId); // This might be wrong in schema, should be linked via reservation -> restaurant
        // Wait, offer_redemptions has reservation_id. We need to join.

        // Correct way to get redemptions for this restaurant:
        const { data: promoData, error: promoErr } = await supabaseAdmin
            .from('offer_redemptions')
            .select(`
                id,
                discount_applied,
                offers (restaurant_id)
            `)
            .eq('offers.restaurant_id', restaurantId);

        const totalDiscount = promoData?.reduce((sum, r) => sum + Number(r.discount_applied || 0), 0) || 0;
        const promoCount = promoData?.length || 0;

        res.json({
            success: true,
            data: {
                period: { start: startISO, end: endISO },
                reservations: {
                    total,
                    completed,
                    noShows,
                    cancelled,
                    occupancyRate: Math.round(occupancyRate * 10) / 10,
                    noShowRate: Math.round(noShowRate * 10) / 10
                },
                marketing: {
                    promoRedemptions: promoCount,
                    totalDiscountApplied: totalDiscount
                }
            }
        });

    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ success: false, error: 'Error al obtener analíticas' });
    }
});

/**
 * POST /api/admin/analytics/snapshots/generate
 * Generates a daily snapshot for the given date (Staff/Admin)
 */
router.post('/snapshots/generate', authMiddleware, async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId || req.body.restaurantId;
        const { date } = req.body;

        if (!restaurantId || !date) {
            return res.status(400).json({ success: false, error: 'restaurantId and date are required' });
        }

        // 1. Fetch data for that day
        const { data: reservations } = await supabaseAdmin
            .from('reservations')
            .select('status, guest_count')
            .eq('restaurant_id', restaurantId)
            .eq('date', date);

        const total = reservations?.length || 0;
        const completed = reservations?.filter(r => r.status === 'completed').length || 0;
        const noShows = reservations?.filter(r => r.status === 'no_show').length || 0;

        // 2. Prepare metrics
        const metrics = [
            { metric_name: 'total_reservations', metric_value: total },
            { metric_name: 'completed_reservations', metric_value: completed },
            { metric_name: 'no_show_reservations', metric_value: noShows }
        ];

        // 3. Upsert snapshots
        for (const metric of metrics) {
            await supabaseAdmin.from('analytics_snapshots').upsert({
                restaurant_id: restaurantId,
                snapshot_date: date,
                metric_name: metric.metric_name,
                metric_value: metric.metric_value,
                metadata: { generatedAt: new Date().toISOString() }
            });
        }

        res.json({ success: true, message: 'Snapshots generated successfully' });

    } catch (error) {
        console.error('Generate snapshot error:', error);
        res.status(500).json({ success: false, error: 'Error generating snapshots' });
    }
});

export default router;
