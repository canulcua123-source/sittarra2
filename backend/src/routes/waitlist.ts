import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/waitlist/join
 * Join the waitlist (public endpoint)
 */
router.post('/join', optionalAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { restaurantId, name, phone, email, partySize, preferredZone, notes } = req.body;

        // Validation
        if (!restaurantId || !name || !phone || !partySize) {
            res.status(400).json({
                success: false,
                error: 'restaurantId, name, phone, and partySize are required',
            });
            return;
        }

        // Verify restaurant exists
        const { data: restaurant, error: rError } = await supabase
            .from('restaurants')
            .select('id, name')
            .eq('id', restaurantId)
            .single();

        if (rError || !restaurant) {
            res.status(404).json({
                success: false,
                error: 'Restaurant not found',
            });
            return;
        }

        // Check if already in waitlist
        const { data: existing } = await supabase
            .from('waitlist')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('phone', phone)
            .in('status', ['waiting', 'notified', 'confirmed'])
            .single();

        if (existing) {
            res.status(400).json({
                success: false,
                error: 'You are already in the waitlist for this restaurant',
            });
            return;
        }

        // Calculate position (count current waiting entries + 1)
        const { data: waitingEntries, count } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .in('status', ['waiting', 'notified']);

        const position = (count || 0) + 1;

        // Create waitlist entry
        const { data: entry, error } = await supabaseAdmin
            .from('waitlist')
            .insert({
                restaurant_id: restaurantId,
                user_id: req.user?.id || null,
                name,
                phone,
                email: email || null,
                party_size: partySize,
                preferred_zone: preferredZone || null,
                notes: notes || null,
                position,
                estimated_wait: position * 15, // 15 min per position estimate
            })
            .select()
            .single();

        if (error) {
            console.error('Error joining waitlist:', error);
            res.status(500).json({
                success: false,
                error: 'Error joining waitlist',
            });
            return;
        }

        res.status(201).json({
            success: true,
            data: entry,
            message: `Added to waitlist at position ${position}`,
        });
    } catch (error) {
        console.error('Join waitlist error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/waitlist/my
 * Get my waitlist entries
 */
router.get('/my', optionalAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { phone } = req.query;

        if (!req.user && !phone) {
            res.status(400).json({
                success: false,
                error: 'Phone number required for non-authenticated users',
            });
            return;
        }

        let query = supabase
            .from('waitlist')
            .select(`
                *,
                restaurants (id, name, phone, address)
            `)
            .in('status', ['waiting', 'notified', 'confirmed'])
            .order('created_at', { ascending: false });

        if (req.user) {
            query = query.eq('user_id', req.user.id);
        } else {
            query = query.eq('phone', phone as string);
        }

        const { data: entries, error } = await query;

        if (error) {
            console.error('Error fetching waitlist entries:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching waitlist entries',
            });
            return;
        }

        res.json({
            success: true,
            data: entries || [],
        });
    } catch (error) {
        console.error('Get waitlist entries error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/waitlist/:id/status
 * Get waitlist entry status
 */
router.get('/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: entry, error } = await supabase
            .from('waitlist')
            .select(`
                *,
                restaurants (id, name, phone)
            `)
            .eq('id', id)
            .single();

        if (error || !entry) {
            res.status(404).json({
                success: false,
                error: 'Waitlist entry not found',
            });
            return;
        }

        // Recalculate current position
        const { count } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true })
            .eq('restaurant_id', entry.restaurant_id)
            .in('status', ['waiting', 'notified'])
            .lt('position', entry.position);

        const currentPosition = (count || 0) + 1;

        res.json({
            success: true,
            data: {
                ...entry,
                currentPosition,
                estimatedWait: currentPosition * 15,
            },
        });
    } catch (error) {
        console.error('Get waitlist status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/waitlist/:id
 * Leave waitlist
 */
router.delete('/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { phone } = req.query;

        // Get entry
        const { data: entry, error: fetchError } = await supabase
            .from('waitlist')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !entry) {
            res.status(404).json({
                success: false,
                error: 'Waitlist entry not found',
            });
            return;
        }

        // Verify ownership
        if (req.user) {
            if (entry.user_id !== req.user.id) {
                res.status(403).json({
                    success: false,
                    error: 'Not authorized to remove this entry',
                });
                return;
            }
        } else if (phone) {
            if (entry.phone !== phone) {
                res.status(403).json({
                    success: false,
                    error: 'Phone number does not match',
                });
                return;
            }
        } else {
            res.status(400).json({
                success: false,
                error: 'Authentication or phone required',
            });
            return;
        }

        // Update status to cancelled instead of deleting
        const { error } = await supabaseAdmin
            .from('waitlist')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) {
            console.error('Error leaving waitlist:', error);
            res.status(500).json({
                success: false,
                error: 'Error leaving waitlist',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Successfully left waitlist',
        });
    } catch (error) {
        console.error('Leave waitlist error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;
