import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/favorites
 * Add a restaurant to favorites
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.body;

        if (!restaurantId) {
            res.status(400).json({
                success: false,
                error: 'restaurantId is required',
            });
            return;
        }

        // Check if restaurant exists
        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .select('id, name')
            .eq('id', restaurantId)
            .single();

        if (restaurantError || !restaurant) {
            res.status(404).json({
                success: false,
                error: 'Restaurant not found',
            });
            return;
        }

        // Check if already favorited (use admin to bypass RLS)
        const { data: existing } = await supabaseAdmin
            .from('favorites')
            .select('id')
            .eq('user_id', req.user!.id)
            .eq('restaurant_id', restaurantId)
            .maybeSingle();

        if (existing) {
            // Already favorited - return success anyway (idempotent)
            res.status(200).json({
                success: true,
                data: existing,
                message: `${restaurant.name} is already in your favorites`,
            });
            return;
        }

        // Add to favorites
        const { data: favorite, error } = await supabaseAdmin
            .from('favorites')
            .insert({
                user_id: req.user!.id,
                restaurant_id: restaurantId,
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding favorite:', error);
            res.status(500).json({
                success: false,
                error: 'Error adding to favorites',
            });
            return;
        }

        res.status(201).json({
            success: true,
            data: favorite,
            message: `${restaurant.name} added to favorites`,
        });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/favorites/my
 * Get current user's favorite restaurants
 */
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
    try {
        console.log('GET /api/favorites/my - User ID:', req.user!.id);

        // Use supabaseAdmin to bypass RLS
        const { data: favorites, error } = await supabaseAdmin
            .from('favorites')
            .select(`
                *,
                restaurants (
                    id,
                    name,
                    description,
                    image_url,
                    cuisine_type,
                    zone,
                    price_range,
                    is_active
                )
            `)
            .eq('user_id', req.user!.id)
            .order('created_at', { ascending: false });

        console.log('Favorites query result:', { favorites, error });

        if (error) {
            console.error('Error fetching favorites:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching favorites',
            });
            return;
        }

        // Get average ratings for each restaurant
        const favoritesWithRatings = await Promise.all(
            (favorites || []).map(async (fav: any) => {
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('rating')
                    .eq('restaurant_id', fav.restaurant_id);

                let averageRating = 0;
                if (reviews && reviews.length > 0) {
                    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                    averageRating = totalRating / reviews.length;
                }

                return {
                    ...fav,
                    restaurants: {
                        ...fav.restaurants,
                        averageRating: Math.round(averageRating * 10) / 10,
                        reviewCount: reviews?.length || 0,
                    },
                };
            })
        );

        res.json({
            success: true,
            data: favoritesWithRatings,
            total: favoritesWithRatings.length,
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/favorites/:restaurantId
 * Remove a restaurant from favorites
 */
router.delete('/:restaurantId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.params;

        // Delete favorite (will succeed even if not found)
        const { error, count } = await supabaseAdmin
            .from('favorites')
            .delete({ count: 'exact' })
            .eq('user_id', req.user!.id)
            .eq('restaurant_id', restaurantId);

        if (error) {
            console.error('Error removing favorite:', error);
            res.status(500).json({
                success: false,
                error: 'Error removing from favorites',
            });
            return;
        }

        if (count === 0) {
            res.status(404).json({
                success: false,
                error: 'Favorite not found',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Restaurant removed from favorites',
        });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/favorites/check/:restaurantId
 * Check if a restaurant is in user's favorites
 */
router.get('/check/:restaurantId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.params;

        // Use supabaseAdmin to bypass RLS
        const { data: favorite, error } = await supabaseAdmin
            .from('favorites')
            .select('id')
            .eq('user_id', req.user!.id)
            .eq('restaurant_id', restaurantId)
            .maybeSingle();

        if (error) {
            console.error('Check favorite error:', error);
            res.status(500).json({
                success: false,
                error: 'Error checking favorite',
            });
            return;
        }

        res.json({
            success: true,
            data: {
                isFavorite: !!favorite,
            },
        });
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;
