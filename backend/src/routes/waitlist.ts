import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, optionalAuthMiddleware, staffMiddleware, staffRestaurantMiddleware } from '../middleware/auth.js';

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
            .maybeSingle();

        if (error) {
            console.error('Get waitlist status error:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching waitlist status',
            });
            return;
        }

        if (!entry) {
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

/**
 * GET /api/waitlist/admin/list
 * Get full waitlist for the restaurant (Staff only)
 */
router.get('/admin/list', authMiddleware, staffRestaurantMiddleware('restaurantId'), async (req: Request, res: Response) => {
    try {
        const restaurantId = req.query.restaurantId as string;

        if (!restaurantId) {
            res.status(400).json({ success: false, error: 'restaurantId is required' });
            return;
        }

        const { data: entries, error } = await supabaseAdmin
            .from('waitlist')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .in('status', ['waiting', 'notified', 'confirmed'])
            .order('position', { ascending: true });

        if (error) throw error;

        res.json({ success: true, data: entries || [] });
    } catch (error) {
        console.error('Admin waitlist error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * PATCH /api/waitlist/admin/:id/status
 * Update waitlist entry status (Staff only)
 * Support: notified, seated, cancelled, no_show
 */
router.patch('/admin/:id/status', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, tableId } = req.body;

        // Verify entry exists and check ownership before update
        const { data: currentEntry, error: fetchError } = await supabaseAdmin
            .from('waitlist')
            .select('restaurant_id')
            .eq('id', id)
            .single();

        if (fetchError || !currentEntry) {
            return res.status(404).json({ success: false, error: 'Entrada de waitlist no encontrada' });
        }

        // Security Check: Use a manual verification as we need to match it with the record's restaurant_id
        const isSuperAdmin = req.user!.role === 'super_admin';
        if (!isSuperAdmin) {
            const { data: staffRecord } = await supabaseAdmin
                .from('restaurant_staff')
                .select('id')
                .eq('user_id', req.user!.id)
                .eq('restaurant_id', currentEntry.restaurant_id)
                .eq('is_active', true)
                .single();

            const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('owner_id')
                .eq('id', currentEntry.restaurant_id)
                .single();

            if (!staffRecord && restaurant?.owner_id !== req.user!.id) {
                return res.status(403).json({ success: false, error: 'No tienes permiso para gestionar este restaurante' });
            }
        }

        const allowedAdminStatuses = ['notified', 'seated', 'cancelled', 'no_show', 'confirmed'];
        if (!allowedAdminStatuses.includes(status)) {
            res.status(400).json({ success: false, error: 'Invalid status for admin update' });
            return;
        }

        const updates: any = {
            status
        };

        if (status === 'notified') {
            updates.notified_at = new Date().toISOString();
        } else if (status === 'seated') {
            updates.seated_at = new Date().toISOString();
            // Free position
            updates.position = null;
        }

        const { data: entry, error } = await supabaseAdmin
            .from('waitlist')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // If seated, update table status if provided
        if (status === 'seated' && tableId) {
            await supabaseAdmin
                .from('tables')
                .update({ status: 'occupied' })
                .eq('id', tableId);
        }

        res.json({
            success: true,
            data: entry,
            message: `Waitlist entry updated to ${status}`
        });
    } catch (error) {
        console.error('Update waitlist status error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
