import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/user/growth-perks
 * Obtiene estadísticas de lealtad y beneficios del usuario
 */
router.get('/growth-perks', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        // 1. Obtener historial de reservaciones
        const { data: reservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('id, status, restaurant_id')
            .eq('user_id', userId);

        if (resError) throw resError;

        // 2. Obtener historial de reseñas
        const { data: reviews, error: revError } = await supabaseAdmin
            .from('reviews')
            .select('id, photos, rating')
            .eq('user_id', userId);

        if (revError) throw revError;

        const completedCount = reservations?.filter(r => r.status === 'completed').length || 0;
        const reviewCount = reviews?.length || 0;

        // CÁLCULO DE PUNTOS DINÁMICO
        // 10 pts por visita + 5 pts por reseña + 2 pts extra si tiene fotos
        const pointsFromVisits = completedCount * 10;
        const pointsFromReviews = reviewCount * 5;
        const pointsFromPhotos = (reviews?.filter(r => r.photos && r.photos.length > 0).length || 0) * 2;
        const totalPoints = pointsFromVisits + pointsFromReviews + pointsFromPhotos;

        // 3. Segmentación Mejorada
        let segment = 'Nuevo Foodie';
        if (totalPoints >= 100) segment = 'Platinum VIP';
        else if (totalPoints >= 50) segment = 'Gourmet Pro';
        else if (totalPoints >= 10) segment = 'Foodie Activo';

        // 4. Obtener cupones disponibles (Ofertas activas generales)
        const { data: availableOffers } = await supabaseAdmin
            .from('offers')
            .select('id, title, promo_code')
            .eq('is_active', true)
            .limit(5);

        res.json({
            success: true,
            data: {
                stats: {
                    totalReservations: reservations?.length || 0,
                    completedVisits: completedCount,
                    totalReviews: reviewCount,
                    loyaltyPoints: totalPoints,
                },
                segment,
                perks: {
                    canRepeatLast: completedCount > 0,
                    exclusiveOffersCount: availableOffers?.length || 0,
                    pointsToNextLevel: totalPoints >= 100 ? 0 : (totalPoints >= 50 ? 100 - totalPoints : 50 - totalPoints)
                }
            }
        });

    } catch (error) {
        console.error('Growth perks error:', error);
        res.status(500).json({ success: false, error: 'Error al obtener beneficios de lealtad' });
    }
});

export default router;
