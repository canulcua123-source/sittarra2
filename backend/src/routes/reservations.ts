import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

/**
 * Generate unique QR code
 */
function generateQRCode(): string {
    return `MF-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

/**
 * POST /api/reservations
 * Create a new reservation
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const {
            restaurantId,
            tableId,
            date,
            time,
            guestCount,
            occasion,
            specialRequest,
            depositPaid,
            depositAmount,
        } = req.body;

        // Validate required fields
        if (!restaurantId || !tableId || !date || !time || !guestCount) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: restaurantId, tableId, date, time, guestCount',
            });
            return;
        }

        // Check if table is available for the given date/time
        const { data: existingReservation } = await supabase
            .from('reservations')
            .select('id')
            .eq('table_id', tableId)
            .eq('date', date)
            .eq('time', time)
            .not('status', 'in', '("cancelled","no_show")')
            .single();

        if (existingReservation) {
            res.status(409).json({
                success: false,
                error: 'This table is already reserved for the selected time',
            });
            return;
        }

        // Check if restaurant requires deposit at this time
        // TODO: Implement peak hour logic based on restaurant settings

        // Create reservation with strict whitelisting to prevent mass assignment
        const qrCode = generateQRCode();
        const userId = req.user!.id; // Use validated ID from token

        const { data: reservation, error } = await supabaseAdmin
            .from('reservations')
            .insert({
                restaurant_id: restaurantId,
                user_id: userId,
                table_id: tableId,
                date,
                time,
                guest_count: Number(guestCount),
                occasion: occasion ? String(occasion) : null,
                special_request: specialRequest ? String(specialRequest) : null,
                status: depositPaid ? 'confirmed' : 'pending',
                deposit_paid: Boolean(depositPaid),
                deposit_amount: depositAmount ? Number(depositAmount) : null,
                deposit_paid_at: depositPaid ? new Date().toISOString() : null,
                qr_code: qrCode,
                // These fields CANNOT be set by the client via mass assignment
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating reservation:', error);
            res.status(500).json({
                success: false,
                error: 'Error creating reservation',
            });
            return;
        }

        // Update table status to pending
        await supabase
            .from('tables')
            .update({ status: 'pending' })
            .eq('id', tableId);

        // TODO: Send confirmation email
        // TODO: Send notification to restaurant

        res.status(201).json({
            success: true,
            data: reservation,
            message: 'Reservation created successfully',
        });
    } catch (error) {
        console.error('Create reservation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/reservations/my
 * Get current user's reservations
 */
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { status, upcoming } = req.query;

        let query = supabaseAdmin
            .from('reservations')
            .select(`
        *,
        restaurants (id, name, image_url, address, phone),
        tables (id, number, capacity)
      `)
            .eq('user_id', req.user!.id)
            .order('date', { ascending: false })
            .order('time', { ascending: false });

        if (status && typeof status === 'string') {
            query = query.eq('status', status);
        }

        if (upcoming === 'true') {
            const today = new Date().toISOString().split('T')[0];
            query = query.gte('date', today);
        }

        const { data: reservations, error } = await query;

        if (error) {
            console.error('Error fetching user reservations:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching reservations',
            });
            return;
        }

        res.json({
            success: true,
            data: reservations,
        });
    } catch (error) {
        console.error('My reservations error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/reservations/:id
 * Get reservation by ID
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: reservation, error } = await supabase
            .from('reservations')
            .select(`
        *,
        restaurants (id, name, image_url, address, phone, email),
        tables (id, number, capacity)
      `)
            .eq('id', id)
            .single();

        if (error || !reservation) {
            res.status(404).json({
                success: false,
                error: 'Reservation not found',
            });
            return;
        }

        // Check if user owns this reservation or is restaurant admin
        if (reservation.user_id !== req.user!.id &&
            req.user!.role !== 'restaurant_admin' &&
            req.user!.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'You do not have access to this reservation',
            });
            return;
        }

        res.json({
            success: true,
            data: reservation,
        });
    } catch (error) {
        console.error('Get reservation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * PATCH /api/reservations/:id/status
 * Update reservation status
 */
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'arrived', 'completed', 'cancelled', 'no_show'];
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
            return;
        }

        // Get the reservation first using admin client to bypass RLS
        const { data: reservation, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('*, tables(id)')
            .eq('id', id)
            .single();

        if (fetchError || !reservation) {
            res.status(404).json({
                success: false,
                error: 'Reservation not found',
            });
            return;
        }

        // IMPORTANT: Security Validation for Admin Context
        const userRestaurantId = (req as any).user?.restaurantId;
        if (req.user!.role === 'restaurant_admin' && reservation.restaurant_id !== userRestaurantId) {
            res.status(403).json({
                success: false,
                error: 'You do not have permission to modify this reservation (wrong restaurant context)',
            });
            return;
        }

        // Update reservation status with admin privileges to ensure RLS doesn't block
        const { data: updatedReservation, error } = await supabaseAdmin
            .from('reservations')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating reservation status:', error);
            res.status(500).json({
                success: false,
                error: 'Error updating reservation status',
            });
            return;
        }

        // Update table status based on reservation status
        let tableStatus: string | null = null;
        switch (status) {
            case 'confirmed':
                // When reservation is confirmed, mark table as occupied/reserved
                tableStatus = 'occupied';
                break;
            case 'arrived':
                tableStatus = 'occupied';
                break;
            case 'completed':
            case 'cancelled':
            case 'no_show':
                // Free the table when reservation ends or is cancelled
                tableStatus = 'available';
                break;
        }

        if (tableStatus) {
            await supabaseAdmin
                .from('tables')
                .update({ status: tableStatus })
                .eq('id', reservation.table_id);
        }

        res.json({
            success: true,
            data: updatedReservation,
            message: `Reservation ${status}`,
        });
    } catch (error) {
        console.error('Update reservation status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/reservations/:id/cancel
 * Cancel a reservation
 */
router.post('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Get the reservation
        const { data: reservation, error: fetchError } = await supabase
            .from('reservations')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !reservation) {
            res.status(404).json({
                success: false,
                error: 'Reservation not found',
            });
            return;
        }

        // Check if user owns this reservation
        if (reservation.user_id !== req.user!.id &&
            req.user!.role !== 'restaurant_admin' &&
            req.user!.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'You do not have permission to cancel this reservation',
            });
            return;
        }

        // IMPORTANT: Security Validation for Admin Context
        const userRestaurantId = (req as any).user?.restaurantId;
        if (req.user!.role === 'restaurant_admin' && reservation.restaurant_id !== userRestaurantId) {
            res.status(403).json({
                success: false,
                error: 'You do not have permission to cancel this reservation (wrong restaurant context)',
            });
            return;
        }

        // Check if reservation can be cancelled
        if (['completed', 'cancelled', 'no_show'].includes(reservation.status)) {
            res.status(400).json({
                success: false,
                error: 'This reservation cannot be cancelled',
            });
            return;
        }

        // Cancel the reservation
        const { error } = await supabase
            .from('reservations')
            .update({
                status: 'cancelled',
                special_request: reservation.special_request
                    ? `${reservation.special_request}\n\n[Cancelled: ${reason || 'No reason provided'}]`
                    : `[Cancelled: ${reason || 'No reason provided'}]`,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error cancelling reservation:', error);
            res.status(500).json({
                success: false,
                error: 'Error cancelling reservation',
            });
            return;
        }

        // Free up the table
        await supabase
            .from('tables')
            .update({ status: 'available' })
            .eq('id', reservation.table_id);

        // TODO: Send cancellation email
        // TODO: Process refund if deposit was paid

        res.json({
            success: true,
            message: 'Reservation cancelled successfully',
        });
    } catch (error) {
        console.error('Cancel reservation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/reservations/:id/arrive
 * Mark reservation as arrived (for restaurant use)
 */
router.post('/:id/arrive', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: updatedReservation, error } = await supabaseAdmin
            .from('reservations')
            .update({
                status: 'arrived',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select('*, tables(id)')
            .single();

        if (error) {
            console.error('Error marking arrival:', error);
            res.status(500).json({
                success: false,
                error: 'Error marking arrival',
            });
            return;
        }

        // Update table status
        await supabaseAdmin
            .from('tables')
            .update({ status: 'occupied' })
            .eq('id', updatedReservation.table_id);

        res.json({
            success: true,
            data: updatedReservation,
            message: 'Arrival registered successfully',
        });
    } catch (error) {
        console.error('Arrive reservation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/reservations/:id/complete
 * Mark reservation as completed and free the table
 */
router.post('/:id/complete', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get the reservation first to get table_id
        const { data: reservation, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('*, tables(id)')
            .eq('id', id)
            .single();

        if (fetchError || !reservation) {
            res.status(404).json({
                success: false,
                error: 'Reservation not found',
            });
            return;
        }

        // Update reservation status to completed
        const { data: updatedReservation, error } = await supabaseAdmin
            .from('reservations')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error completing reservation:', error);
            res.status(500).json({
                success: false,
                error: 'Error completing reservation',
            });
            return;
        }

        // Free the table
        if (reservation.table_id) {
            await supabaseAdmin
                .from('tables')
                .update({ status: 'available' })
                .eq('id', reservation.table_id);
        }

        res.json({
            success: true,
            data: updatedReservation,
            message: 'Service completed successfully',
        });
    } catch (error) {
        console.error('Complete reservation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;
