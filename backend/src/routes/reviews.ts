import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper to log errors safely
const logError = (context: string, error: any) => {
    console.error(`[REVIEWS ERROR] ${context}:`, error?.message || error);
    if (error?.details) console.error(`[REVIEWS DETAILS]`, error.details);
    if (error?.hint) console.error(`[REVIEWS HINT]`, error.hint);
};

/**
 * GET /api/reviews
 * Get all reviews (optionally filtered by restaurant)
 */
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { restaurantId, limit = 20, offset = 0 } = req.query;

        let query = supabaseAdmin
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (restaurantId) {
            query = query.eq('restaurant_id', restaurantId);
        }

        const { data: reviews, error } = await query;

        if (error) {
            logError('Error fetching reviews', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching reviews',
            });
            return;
        }

        // Manual join for users to avoid relationship ambiguity issues
        if (reviews && reviews.length > 0) {
            const userIds = [...new Set(reviews.map(r => r.user_id))].filter(Boolean);
            const { data: users } = await supabaseAdmin
                .from('users')
                .select('id, name, avatar_url')
                .in('id', userIds);

            if (users) {
                const userMap = (users as any[]).reduce((acc: any, u: any) => {
                    acc[u.id] = u;
                    return acc;
                }, {});

                reviews.forEach((r: any) => {
                    const userData = userMap[r.user_id];
                    // Ensure structured user object for frontend consistency
                    r.user = {
                        id: r.user_id,
                        name: userData?.name || 'Cliente de Sittara',
                        avatar_url: userData?.avatar_url || null
                    };
                    // Compatibility fields
                    r.customerName = r.user.name;
                    r.customerAvatar = r.user.avatar_url;
                });
                console.log(`[REVIEWS] Manual join completed for ${reviews.length} reviews`);
            }
        }

        res.json({
            success: true,
            data: reviews,
        });
    } catch (error) {
        console.error('Reviews route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/reviews
 * Create a new review
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const {
            restaurantId,
            reservationId,
            rating,
            foodRating,
            serviceRating,
            ambianceRating,
            valueRating,
            comment,
            tags,
            photos
        } = req.body;

        console.log('[REVIEWS] Body received:', JSON.stringify(req.body, null, 2));

        if (!restaurantId || !reservationId || !rating || rating < 1 || rating > 5) {
            const missing = [];
            if (!restaurantId) missing.push('restaurantId');
            if (!reservationId) missing.push('reservationId');
            if (!rating) missing.push('rating');
            else if (rating < 1 || rating > 5) missing.push('invalid rating value');

            console.error('[REVIEWS] Validation failed:', missing);
            res.status(400).json({
                success: false,
                error: `Missing or invalid fields: ${missing.join(', ')}`,
            });
            return;
        }

        // Check if user already reviewed this restaurant (for this reservation if provided)
        console.log('[REVIEWS] Checking existing review for:', { restaurantId, reservationId, userId });
        let existingQuery = supabase
            .from('reviews')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('user_id', userId);

        if (reservationId) {
            existingQuery = existingQuery.eq('reservation_id', reservationId);
        }

        const { data: existingReview } = await existingQuery.single();

        if (existingReview) {
            res.status(400).json({
                success: false,
                error: 'Ya has calificado esta visita',
            });
            return;
        }

        // BUSINESS LOGIC: Verify if the user has a completed reservation for this restaurant
        const { data: pastReservation, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('id, status, user_id')
            .eq('id', reservationId)
            .eq('restaurant_id', restaurantId)
            .eq('user_id', userId)
            .single();

        if (resError || !pastReservation) {
            res.status(404).json({
                success: false,
                error: 'No se encontró una reservación válida para esta reseña',
            });
            return;
        }

        if (pastReservation.status !== 'completed') {
            res.status(403).json({
                success: false,
                error: 'Solo puedes reseñar visitas que han sido marcadas como completadas',
            });
            return;
        }

        // Create review with strict whitelisting
        const { data: review, error } = await supabaseAdmin
            .from('reviews')
            .insert({
                restaurant_id: String(restaurantId),
                user_id: userId, // From token
                reservation_id: reservationId ? String(reservationId) : null,
                rating: Number(rating),
                food_rating: foodRating ? Number(foodRating) : null,
                service_rating: serviceRating ? Number(serviceRating) : null,
                ambiance_rating: ambianceRating ? Number(ambianceRating) : null,
                value_rating: valueRating ? Number(valueRating) : null,
                comment: comment ? String(comment) : null,
                photos: Array.isArray(photos) ? photos : [],
                tags: Array.isArray(tags) ? tags : [],
                is_verified: true, // It's verified because we checked the reservation status
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating review:', error);
            res.status(500).json({
                success: false,
                error: 'Error creating review',
            });
            return;
        }

        // Update reservation to mark as rated (if applicable)
        if (reservationId) {
            await supabaseAdmin
                .from('reservations')
                .update({ has_review: true })
                .eq('id', reservationId);
        }

        // --- NEW: Atomic update for Restaurant aggregate ratings ---
        try {
            const { data: allReviews } = await supabaseAdmin
                .from('reviews')
                .select('rating')
                .eq('restaurant_id', restaurantId);

            if (allReviews && allReviews.length > 0) {
                const totalRating = allReviews.reduce((acc, r) => acc + r.rating, 0);
                const averageRating = totalRating / allReviews.length;

                await supabaseAdmin
                    .from('restaurants')
                    .update({
                        rating: averageRating,
                        review_count: allReviews.length
                    })
                    .eq('id', restaurantId);

                console.log(`[REVIEWS] Updated restaurant ${restaurantId} with new rating: ${averageRating} (${allReviews.length} reviews)`);
            }
        } catch (aggError) {
            console.error('[REVIEWS] Failed to update restaurant aggregates:', aggError);
        }

        res.status(201).json({
            success: true,
            data: review,
            message: '¡Gracias por tu opinión!',
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/reviews/:id/response
 * Restaurant owner responds to a review
 */
router.post('/:id/response', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { response } = req.body;
        const userId = req.user?.id;

        if (!response) {
            res.status(400).json({
                success: false,
                error: 'Response text is required',
            });
            return;
        }

        // Get review and verify ownership
        const { data: review, error: reviewError } = await supabase
            .from('reviews')
            .select('restaurant_id')
            .eq('id', id)
            .single();

        if (reviewError || !review) {
            res.status(404).json({
                success: false,
                error: 'Review not found',
            });
            return;
        }

        // IMPORTANT: Security Validation for Admin Context
        const userRestaurantId = (req as any).user?.restaurantId;
        const userRole = (req as any).user?.role;

        if (userRole !== 'super_admin' && review.restaurant_id !== userRestaurantId) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to respond to this review (wrong restaurant context)',
            });
            return;
        }

        // Save response
        const { data: updatedReview, error } = await supabaseAdmin
            .from('reviews')
            .update({
                response,
                responded_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*, restaurants(name)')
            .single();

        if (error) {
            console.error('Error saving response:', error);
            res.status(500).json({
                success: false,
                error: 'Error saving response',
            });
            return;
        }

        // CREATE NOTIFICATION for the user
        try {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: (updatedReview as any).user_id,
                    type: 'review_response',
                    title: '¡Han respondido a tu reseña!',
                    message: `${(updatedReview as any).restaurants?.name || 'El restaurante'} ha respondido a tu comentario.`,
                    data: { reviewId: id, restaurantId: (updatedReview as any).restaurant_id }
                });
        } catch (notifError) {
            console.error('[REVIEWS] Failed to create notification:', notifError);
            // Don't fail the main request if notification fails
        }

        res.json({
            success: true,
            data: updatedReview,
        });
    } catch (error) {
        console.error('Review response error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/reviews/stats/:restaurantId
 * Get review statistics for a restaurant
 */
router.get('/stats/:restaurantId?', async (req: Request, res: Response) => {
    try {
        // Use restaurantId from params or from authenticated user context
        const restaurantId = req.params.restaurantId || (req as any).user?.restaurantId;

        if (!restaurantId) {
            res.status(400).json({ success: false, error: 'Restaurant ID is required' });
            return;
        }

        const { data: reviews, error } = await supabaseAdmin
            .from('reviews')
            .select('rating, food_rating, service_rating, ambiance_rating, value_rating')
            .eq('restaurant_id', restaurantId);

        if (error) {
            console.error('Error fetching review stats:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching statistics',
            });
            return;
        }

        if (!reviews || reviews.length === 0) {
            res.json({
                success: true,
                data: {
                    count: 0,
                    averageRating: 0,
                    averageFoodRating: 0,
                    averageServiceRating: 0,
                    averageAmbianceRating: 0,
                    averageValueRating: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
            });
            return;
        }

        const count = reviews.length;

        // Calculate averages
        const calcAverage = (key: string) => {
            const validReviews = reviews.filter((r: any) => r[key] !== null && r[key] !== undefined);
            if (validReviews.length === 0) return 0;
            const sum = validReviews.reduce((acc: number, r: any) => acc + r[key], 0);
            return sum / validReviews.length;
        };

        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r: any) => {
            if (r.rating >= 1 && r.rating <= 5) {
                distribution[r.rating]++;
            }
        });

        res.json({
            success: true,
            data: {
                count,
                averageRating: Math.round(calcAverage('rating') * 10) / 10,
                averageFoodRating: Math.round(calcAverage('food_rating') * 10) / 10,
                averageServiceRating: Math.round(calcAverage('service_rating') * 10) / 10,
                averageAmbianceRating: Math.round(calcAverage('ambiance_rating') * 10) / 10,
                averageValueRating: Math.round(calcAverage('value_rating') * 10) / 10,
                distribution
            }
        });
    } catch (error) {
        console.error('Review stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/reviews/:id
 * Get a specific review by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: review, error } = await supabase
            .from('reviews')
            .select(`
                *,
                users (id, name, avatar_url),
                restaurants (id, name)
            `)
            .eq('id', id)
            .single();

        if (error || !review) {
            res.status(404).json({
                success: false,
                error: 'Review not found',
            });
            return;
        }

        res.json({
            success: true,
            data: review,
        });
    } catch (error) {
        console.error('Get review error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * PATCH /api/reviews/:id
 * Update user's own review
 */
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { rating, foodRating, serviceRating, ambianceRating, valueRating, comment, tags } = req.body;

        // Get review and verify ownership
        const { data: review, error: fetchError } = await supabase
            .from('reviews')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !review) {
            res.status(404).json({
                success: false,
                error: 'Review not found',
            });
            return;
        }

        if (review.user_id !== req.user!.id) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to update this review',
            });
            return;
        }

        // Build update object
        const updates: any = { updated_at: new Date().toISOString() };
        if (rating !== undefined) updates.rating = rating;
        if (foodRating !== undefined) updates.food_rating = foodRating;
        if (serviceRating !== undefined) updates.service_rating = serviceRating;
        if (ambianceRating !== undefined) updates.ambiance_rating = ambianceRating;
        if (valueRating !== undefined) updates.value_rating = valueRating;
        if (comment !== undefined) updates.comment = comment;
        if (tags !== undefined) updates.tags = tags;

        // Update review
        const { data: updated, error } = await supabase
            .from('reviews')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating review:', error);
            res.status(500).json({
                success: false,
                error: 'Error updating review',
            });
            return;
        }

        res.json({
            success: true,
            data: updated,
            message: 'Review updated successfully',
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/reviews/:id
 * Delete user's own review
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get review and verify ownership
        const { data: review, error: fetchError } = await supabase
            .from('reviews')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !review) {
            res.status(404).json({
                success: false,
                error: 'Review not found',
            });
            return;
        }

        if (review.user_id !== req.user!.id && req.user!.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'Not authorized to delete this review',
            });
            return;
        }

        // Delete review
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting review:', error);
            res.status(500).json({
                success: false,
                error: 'Error deleting review',
            });
            return;
        }

        // Update reservation if linked
        if (review.reservation_id) {
            await supabase
                .from('reservations')
                .update({ has_review: false })
                .eq('id', review.reservation_id);
        }

        res.json({
            success: true,
            message: 'Review deleted successfully',
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/reviews/:id/helpful
 * Mark a review as helpful
 */
router.post('/:id/helpful', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get current review
        const { data: review, error: fetchError } = await supabaseAdmin
            .from('reviews')
            .select('helpful_count')
            .eq('id', id)
            .single();

        if (fetchError || !review) {
            logError('Fetch for helpful failed', fetchError);
            res.status(404).json({
                success: false,
                error: 'Review not found or database error',
            });
            return;
        }

        // Update helpful count
        const { error: updateError } = await supabaseAdmin
            .from('reviews')
            .update({ helpful_count: (review.helpful_count || 0) + 1 })
            .eq('id', id);

        if (updateError) {
            logError('Update helpful failed', updateError);
            res.status(500).json({
                success: false,
                error: 'Failed to update helpful count',
                details: updateError.message
            });
            return;
        }

        res.json({
            success: true,
            message: 'Marked as helpful',
        });
    } catch (error: any) {
        logError('Mark as helpful unexpected error', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error?.message
        });
    }
});

export default router;
