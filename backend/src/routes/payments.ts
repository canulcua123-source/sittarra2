import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Initialize Stripe with secret key 
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});

/**
 * POST /api/payments/create-intent
 * Create a PaymentIntent for reservation deposit
 */
router.post('/create-intent', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { amount, currency = 'mxn', reservationData } = req.body;
        const userId = (req as any).user?.id;

        if (!amount || amount <= 0) {
            res.status(400).json({
                success: false,
                error: 'Amount is required and must be greater than 0',
            });
            return;
        }

        // Stripe MXN minimum is $10 MXN (1000 centavos)
        const minimumAmount = 10;
        const finalAmount = Math.max(amount, minimumAmount);

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(finalAmount * 100), // Stripe expects cents/centavos
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId,
                restaurantId: reservationData?.restaurantId || '',
                date: reservationData?.date || '',
                time: reservationData?.time || '',
                guestCount: reservationData?.guestCount?.toString() || '',
            },
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount,
        });
    } catch (error: any) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error creating payment intent',
        });
    }
});

/**
 * POST /api/payments/confirm
 * Confirm payment was successful and update reservation
 */
router.post('/confirm', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { paymentIntentId, reservationId } = req.body;

        // Verify payment with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            res.status(400).json({
                success: false,
                error: 'Payment not completed',
            });
            return;
        }

        // Update reservation with deposit_paid = true
        if (reservationId) {
            const { error } = await supabaseAdmin
                .from('reservations')
                .update({
                    deposit_paid: true,
                    deposit_paid_at: new Date().toISOString(),
                    deposit_amount: paymentIntent.amount / 100,
                })
                .eq('id', reservationId);

            if (error) {
                console.error('Error updating reservation:', error);
            }
        }

        res.json({
            success: true,
            message: 'Payment confirmed',
            paymentIntent: {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
            },
        });
    } catch (error: any) {
        console.error('Error confirming payment:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error confirming payment',
        });
    }
});

/**
 * POST /api/payments/webhook
 * Stripe webhook for payment events (optional, for production)
 */
router.post('/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        let event;

        if (webhookSecret && sig) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            event = req.body;
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.log(`💰 Payment succeeded: ${paymentIntent.id}`);

                // Update reservation via webhook for reliability
                const reservationId = paymentIntent.metadata?.reservationId;
                if (reservationId) {
                    try {
                        await supabaseAdmin
                            .from('reservations')
                            .update({
                                deposit_paid: true,
                                deposit_paid_at: new Date().toISOString(),
                                deposit_amount: paymentIntent.amount / 100,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', reservationId);
                        console.log(`✅ Reservation ${reservationId} updated via webhook`);
                    } catch (err) {
                        console.error(`❌ Failed to update reservation ${reservationId} via webhook:`, err);
                    }
                }
                break;
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                console.log(`❌ Payment failed: ${failedPayment.id}`);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});


/**
 * POST /api/payments/refund
 * Process a refund for a cancelled reservation
 */
router.post('/refund', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { paymentIntentId, reservationId, reason } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                error: 'Payment Intent ID is required'
            });
        }

        // Verify the reservation exists and belongs to the user
        if (reservationId) {
            const { data: reservation, error: resError } = await supabaseAdmin
                .from('reservations')
                .select('user_id, status, deposit_paid')
                .eq('id', reservationId)
                .single();

            if (resError || !reservation) {
                return res.status(404).json({
                    success: false,
                    error: 'Reservation not found'
                });
            }

            // Check ownership
            if (reservation.user_id !== req.user!.id && req.user!.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized to refund this reservation'
                });
            }

            // Verify deposit was paid
            if (!reservation.deposit_paid) {
                return res.status(400).json({
                    success: false,
                    error: 'No deposit was paid for this reservation'
                });
            }
        }

        // Create refund via Stripe
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: reason || 'requested_by_customer',
            metadata: {
                reservationId: reservationId || '',
                refundReason: reason || 'Customer requested cancellation'
            }
        });

        // Update reservation to mark refund processed
        if (reservationId && refund.status === 'succeeded') {
            await supabaseAdmin
                .from('reservations')
                .update({
                    deposit_paid: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', reservationId);
        }

        res.json({
            success: true,
            message: 'Refund processed successfully',
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
                currency: refund.currency
            }
        });

    } catch (error: any) {
        console.error('Refund error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error processing refund'
        });
    }
});

export default router;
