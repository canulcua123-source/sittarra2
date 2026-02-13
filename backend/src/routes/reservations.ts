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
 * GET /api/reservations/my/latest
 * Obtiene la última reservación completada para repetir rápidamente
 */
router.get('/my/latest', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { data: latest, error } = await supabaseAdmin
            .from('reservations')
            .select(`
                *,
                restaurants (id, name, image_url, cuisine_type)
            `)
            .eq('user_id', req.user!.id)
            .order('date', { ascending: false })
            .order('time', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        res.json({
            success: true,
            data: latest
        });
    } catch (error) {
        console.error('Get latest reservation error:', error);
        res.status(500).json({ success: false, error: 'Error al obtener última reservación' });
    }
});

/**
 * POST /api/reservations/repeat/:id
 * Clona una reservación pasada con nueva fecha/hora
 */
router.post('/repeat/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, time } = req.body;

        if (!date || !time) {
            return res.status(400).json({ success: false, error: 'Fecha y hora son requeridas' });
        }

        // 1. Obtener datos de la reservación original
        const { data: original, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user!.id)
            .single();

        if (fetchError || !original) {
            return res.status(404).json({ success: false, error: 'Reservación original no encontrada' });
        }

        // 2. Validar disponibilidad actual de la misma mesa
        const { data: conflict } = await supabaseAdmin
            .from('reservations')
            .select('id')
            .eq('table_id', original.table_id)
            .eq('date', date)
            .eq('time', time)
            .not('status', 'in', '("cancelled","no_show")')
            .maybeSingle();

        if (conflict) {
            return res.status(409).json({ success: false, error: 'La mesa ya está ocupada para ese horario. Por favor selecciona otro momento.' });
        }

        // 3. Crear nueva reservación con parámetros clonados
        const qrCode = `MF-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

        const { data: newReservation, error: createError } = await supabaseAdmin
            .from('reservations')
            .insert({
                restaurant_id: original.restaurant_id,
                user_id: req.user!.id,
                table_id: original.table_id,
                date,
                time,
                guest_count: original.guest_count,
                occasion: original.occasion,
                special_request: original.special_request,
                status: 'pending',
                qr_code: qrCode,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (createError) throw createError;

        res.status(201).json({
            success: true,
            data: newReservation,
            message: 'Reservación repetida con éxito'
        });
    } catch (error) {
        console.error('Repeat reservation error:', error);
        res.status(500).json({ success: false, error: 'Error al repetir reservación' });
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

        // Get the reservation first to verify ownership/context
        const { data: reservation, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('restaurant_id')
            .eq('id', id)
            .single();

        if (fetchError || !reservation) {
            res.status(404).json({ success: false, error: 'Reserva no encontrada' });
            return;
        }

        // Security check: Must be owner, staff of THIS restaurant, or super_admin
        const isSuperAdmin = req.user!.role === 'super_admin';
        const userRestaurantId = (req as any).user?.restaurantId;

        if (!isSuperAdmin) {
            // Check if user is linked to this restaurant
            const { data: staffRecord } = await supabaseAdmin
                .from('restaurant_staff')
                .select('id')
                .eq('user_id', req.user!.id)
                .eq('restaurant_id', reservation.restaurant_id)
                .eq('is_active', true)
                .single();

            // Also check if they are the restaurant owner
            const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('owner_id')
                .eq('id', reservation.restaurant_id)
                .single();

            const isOwner = restaurant?.owner_id === req.user!.id;

            if (!staffRecord && !isOwner) {
                res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para marcar llegada en este restaurante',
                });
                return;
            }
        }

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
 * (Legacy support for POST)
 */
router.post('/:id/complete', authMiddleware, completeReservationHandler);

/**
 * PATCH /api/reservations/:id/complete
 * Mark reservation as completed and free the table
 * (Recommended semantic endpoint)
 */
router.patch('/:id/complete', authMiddleware, completeReservationHandler);

/**
 * PATCH /api/reservations/:id/no-show
 * Mark reservation as no-show and free the table
 */
router.patch('/:id/no-show', authMiddleware, noShowReservationHandler);

/**
 * Handler for completing a reservation
 */
async function completeReservationHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // Get the reservation first to get table_id and restaurant name
        const { data: reservation, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('*, tables(id), restaurants(name)')
            .eq('id', id)
            .single();

        if (fetchError || !reservation) {
            res.status(404).json({
                success: false,
                error: 'Reservation not found',
            });
            return;
        }

        // Security check: Must be owner, staff of THIS restaurant, or super_admin
        const isSuperAdmin = req.user!.role === 'super_admin';
        if (!isSuperAdmin) {
            const { data: staffRecord } = await supabaseAdmin
                .from('restaurant_staff')
                .select('id')
                .eq('user_id', req.user!.id)
                .eq('restaurant_id', reservation.restaurant_id)
                .eq('is_active', true)
                .single();

            const { data: restaurantOwner } = await supabaseAdmin
                .from('restaurants')
                .select('owner_id')
                .eq('id', reservation.restaurant_id)
                .single();

            if (!staffRecord && restaurantOwner?.owner_id !== req.user!.id) {
                res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para completar reservaciones en este restaurante',
                });
                return;
            }
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

        // PHASE 3 TRIGGER: Automated Review Request
        try {
            const { NotificationService } = await import('../services/notifications.js');
            const restaurantName = (reservation.restaurants as any)?.name || 'el restaurante';

            await NotificationService.requestReview(
                reservation.user_id,
                reservation.id,
                restaurantName
            );
            console.log(`[PHASE 3] Review request queued for user ${reservation.user_id}`);
        } catch (triggerError) {
            console.error('[PHASE 3] Failed to trigger review request:', triggerError);
            // Don't fail the response if the notification fails
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
}

/**
 * Handler for marking a no-show
 */
async function noShowReservationHandler(req: Request, res: Response) {
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

        // Security check: Must be owner, staff of THIS restaurant, or super_admin
        const isSuperAdmin = req.user!.role === 'super_admin';
        if (!isSuperAdmin) {
            const { data: staffRecord } = await supabaseAdmin
                .from('restaurant_staff')
                .select('id')
                .eq('user_id', req.user!.id)
                .eq('restaurant_id', reservation.restaurant_id)
                .eq('is_active', true)
                .single();

            const { data: restaurantOwner } = await supabaseAdmin
                .from('restaurants')
                .select('owner_id')
                .eq('id', reservation.restaurant_id)
                .single();

            if (!staffRecord && restaurantOwner?.owner_id !== req.user!.id) {
                res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para gestionar no-shows en este restaurante',
                });
                return;
            }
        }

        // Update reservation status to no_show
        const { data: updatedReservation, error } = await supabaseAdmin
            .from('reservations')
            .update({
                status: 'no_show',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error marking no-show:', error);
            res.status(500).json({
                success: false,
                error: 'Error marking no-show',
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
            message: 'Reservation marked as no-show',
        });
    } catch (error) {
        console.error('No-show reservation error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
}



/**
 * POST /api/reservations/verify-qr
 * Verify a reservation via QR code
 */
/**
 * POST /api/reservations/verify-qr
 * Verify a reservation via QR code. Requires restaurant admin auth.
 */
router.post('/verify-qr', authMiddleware, async (req: Request, res: Response) => {
    try {
        let { qrCode, restaurantId, autoArrive } = req.body;

        console.log('--------------------------------------------------');
        console.log('[DEBUG QR SCAN] Incoming Scan Request');
        console.log('[DEBUG QR SCAN] qrCode:', qrCode);
        console.log('[DEBUG QR SCAN] restaurantId:', restaurantId);
        console.log('[DEBUG QR SCAN] autoArrive:', autoArrive);
        console.log('--------------------------------------------------');

        // Security check: Must be owner, staff of THIS restaurant, or super_admin
        const isSuperAdmin = req.user!.role === 'super_admin';
        if (!isSuperAdmin) {
            const { data: staffRecord } = await supabaseAdmin
                .from('restaurant_staff')
                .select('id')
                .eq('user_id', req.user!.id)
                .eq('restaurant_id', restaurantId)
                .eq('is_active', true)
                .single();

            const { data: restaurantOwner } = await supabaseAdmin
                .from('restaurants')
                .select('owner_id')
                .eq('id', restaurantId)
                .single();

            if (!staffRecord && restaurantOwner?.owner_id !== req.user!.id) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para verificar códigos de este restaurante',
                });
            }
        }

        if (!qrCode) {
            return res.status(400).json({ success: false, error: 'QR code is required' });
        }

        // Check if qrCode is a JSON string (mobile app format)
        try {
            if (qrCode.startsWith('{') && qrCode.endsWith('}')) {
                const parsed = JSON.parse(qrCode);
                console.log('[VERIFY QR] Parsed JSON:', parsed);

                // Prioritize code or reservationId from JSON
                if (parsed.code) qrCode = parsed.code;
                else if (parsed.reservationId) qrCode = parsed.reservationId;
            }
        } catch (e) {
            // Not a JSON, continue with original string
            console.log('[VERIFY QR] Code is not JSON, continuing as plain string');
        }

        console.log('[VERIFY QR] Searching for:', qrCode);

        // 1. Try exact match by qr_code column
        let { data: reservation, error } = await supabaseAdmin
            .from('reservations')
            .select(`
                *,
                users (id, name, email, phone, avatar_url),
                tables (id, number, name)
            `)
            .eq('restaurant_id', restaurantId)
            .eq('qr_code', qrCode)
            .maybeSingle();

        // 2. Try by full reservation ID
        if (!reservation) {
            const { data: byId } = await supabaseAdmin
                .from('reservations')
                .select(`
                    *,
                    users (id, name, email, phone, avatar_url),
                    tables (id, number, name)
                `)
                .eq('restaurant_id', restaurantId)
                .eq('id', qrCode)
                .maybeSingle();

            reservation = byId;
        }

        // 3. Fallback: Try searching for qr_code contained in ID (for older records)
        if (!reservation) {
            const { data: byPartial } = await supabaseAdmin
                .from('reservations')
                .select(`
                    *,
                    users (id, name, email, phone, avatar_url),
                    tables (id, number, name)
                `)
                .eq('restaurant_id', restaurantId)
                .ilike('id', `${qrCode}%`)
                .maybeSingle();

            reservation = byPartial;
        }

        if (!reservation) {
            console.log('[VERIFY QR] Not found:', qrCode);
            res.status(404).json({
                success: false,
                error: 'Reserva no encontrada o inválida para este restaurante.',
            });
            return;
        }

        // AUTO-ARRIVE: If requested and reservation is in a valid pre-arrival state
        let autoArrived = false;
        if (autoArrive && ['pending', 'confirmed'].includes(reservation.status)) {
            const { data: arrivedReservation, error: arriveError } = await supabaseAdmin
                .from('reservations')
                .update({
                    status: 'arrived',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', reservation.id)
                .select(`
                    *,
                    users (id, name, email, phone, avatar_url),
                    tables (id, number, name)
                `)
                .single();

            if (!arriveError && arrivedReservation) {
                // Update table to occupied
                if (reservation.table_id) {
                    await supabaseAdmin
                        .from('tables')
                        .update({ status: 'occupied' })
                        .eq('id', reservation.table_id);
                }
                reservation = arrivedReservation;
                autoArrived = true;
                console.log(`[VERIFY QR] Auto-arrived reservation ${reservation.id}`);
            } else {
                console.error('[VERIFY QR] Auto-arrive failed:', arriveError);
                // Continue without auto-arrive — non-blocking
            }
        } else if (autoArrive && reservation.status === 'arrived') {
            // Already arrived — idempotent, just return success
            autoArrived = true;
            console.log(`[VERIFY QR] Reservation ${reservation.id} already arrived (idempotent)`);
        }

        res.json({
            success: true,
            data: reservation,
            autoArrived,
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
