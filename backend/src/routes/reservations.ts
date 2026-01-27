import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import crypto from 'crypto';
import Stripe from 'stripe';
import * as emailService from '../services/email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});

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

        // Send confirmation email
        if (req.user?.email) {
            await emailService.sendReservationConfirmation(req.user.email, {
                ...reservation,
                guestCount: reservation.guest_count, // Map DB field to service expected field
            });
        }

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

        // Calculate statistics
        const stats = {
            total: reservations.length,
            completed: reservations.filter((r: any) => r.status === 'completed').length,
            cancelled: reservations.filter((r: any) => r.status === 'cancelled').length,
            noShow: reservations.filter((r: any) => r.status === 'no_show').length,
            upcoming: reservations.filter((r: any) => ['pending', 'confirmed'].includes(r.status) && new Date(r.date) >= new Date()).length
        };

        res.json({
            success: true,
            data: reservations,
            stats
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
router.post('/:id/cancel',
    authMiddleware,
    auditMiddleware({ action: 'cancel_reservation', entityType: 'reservation' }),
    async (req: Request, res: Response) => {
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

            // Send cancellation email
            if (req.user?.email) {
                await emailService.sendReservationCancellation(req.user.email, reservation);
            }

            // Process refund if deposit was paid
            if (reservation.deposit_paid && reservation.payment_intent_id) {
                try {
                    await stripe.refunds.create({
                        payment_intent: reservation.payment_intent_id,
                    });
                    console.log(`Refund processed for reservation ${id}`);
                } catch (refundError) {
                    console.error(`Error processing refund for reservation ${id}:`, refundError);
                    // We don't fail the cancellation if refund fails, but should log it
                }
            }

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


/**
 * POST /api/reservations/verify-qr
 * Verify a reservation via QR code
 */
router.post('/verify-qr', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { qrCode, restaurantId } = req.body;

        if (!qrCode || !restaurantId) {
            res.status(400).json({
                success: false,
                error: 'QR code and restaurant ID are required',
            });
            return;
        }

        // 1. Try exact match by qr_code column first
        let { data: reservation, error } = await supabaseAdmin
            .from('reservations')
            .select(`
                *,
                users (id, name, email, phone, avatar_url),
                tables (id, number, name)
            `)
            .eq('restaurant_id', restaurantId)
            .eq('qr_code', qrCode)
            .single();

        // 2. If not found, try by ID (if it looks like a UUID)
        if (!reservation && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrCode)) {
            const { data: byId } = await supabaseAdmin
                .from('reservations')
                .select(`
                    *,
                    users (id, name, email, phone, avatar_url),
                    tables (id, number, name)
                `)
                .eq('restaurant_id', restaurantId)
                .eq('id', qrCode)
                .single();

            reservation = byId;
        }

        // 3. Last resort: internal logic check if qrCode matches generated format from ID
        // (This might be slow if we have to scan, but we can assume normal flow hits step 1)

        if (!reservation) {
            res.status(404).json({
                success: false,
                error: 'Reserva no encontrada o inválida para este restaurante.',
            });
            return;
        }

        res.json({
            success: true,
            data: reservation,
        });

    } catch (error) {
        console.error('Verify QR error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
/**
 * PATCH /api/reservations/:id
 * Reschedule a reservation (update date, time, guest count)
 */
router.patch('/:id',
    authMiddleware,
    auditMiddleware({ action: 'reschedule_reservation', entityType: 'reservation' }),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { date, time, guestCount } = req.body;

            if (!date && !time && !guestCount) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one field (date, time, guestCount) is required for update'
                });
            }

            // Get the current reservation
            const { data: reservation, error: fetchError } = await supabaseAdmin
                .from('reservations')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !reservation) {
                return res.status(404).json({ success: false, error: 'Reservation not found' });
            }

            // Check ownership
            if (reservation.user_id !== req.user!.id && req.user!.role !== 'super_admin') {
                return res.status(403).json({ success: false, error: 'Unauthorized to modify this reservation' });
            }

            // Validate new capacity if guestCount changed
            const finalGuestCount = guestCount ? Number(guestCount) : reservation.guest_count;
            const finalDate = date || reservation.date;
            const finalTime = time || reservation.time;

            // Check if the new date is a holiday
            if (date) {
                const { data: restaurant } = await supabaseAdmin
                    .from('restaurants')
                    .select('holidays')
                    .eq('id', reservation.restaurant_id)
                    .single();

                const holidays = restaurant?.holidays || [];
                const isHoliday = holidays.some((h: any) => h.date === finalDate && h.closed);

                if (isHoliday) {
                    return res.status(400).json({
                        success: false,
                        error: 'The restaurant is closed on the selected holiday date'
                    });
                }
            }

            if (guestCount) {
                const { data: table } = await supabase
                    .from('tables')
                    .select('capacity')
                    .eq('id', reservation.table_id)
                    .single();

                if (table && finalGuestCount > table.capacity) {
                    return res.status(400).json({
                        success: false,
                        error: `The current table only has a capacity of ${table.capacity} guests`
                    });
                }
            }

            // Check availability for the new slot if date or time changed
            if (date || time) {
                const { data: conflict } = await supabase
                    .from('reservations')
                    .select('id')
                    .eq('table_id', reservation.table_id)
                    .eq('date', finalDate)
                    .eq('time', finalTime)
                    .neq('id', id) // Exclude current reservation
                    .not('status', 'in', '("cancelled","no_show")')
                    .single();

                if (conflict) {
                    return res.status(409).json({
                        success: false,
                        error: 'The table is already reserved at the new selected time'
                    });
                }
            }

            // Perform update
            const { data: updatedReservation, error: updateError } = await supabaseAdmin
                .from('reservations')
                .update({
                    date: finalDate,
                    time: finalTime,
                    guest_count: finalGuestCount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            res.json({
                success: true,
                data: updatedReservation,
                message: 'Reservation rescheduled successfully'
            });

        } catch (error) {
            console.error('Reschedule reservation error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

export default router;
