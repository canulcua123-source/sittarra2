import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});

/**
 * GET /api/admin/payments/transactions
 * List recent Stripe transactions related to reservations
 */
router.get('/transactions', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;

        // Fetch paid reservations for this restaurant
        const { data: reservations, error } = await supabaseAdmin
            .from('reservations')
            .select(`
                id,
                date,
                time,
                guest_count,
                deposit_amount,
                payment_intent_id,
                users (name, email)
            `)
            .eq('restaurant_id', restaurantId)
            .eq('deposit_paid', true)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        // If we have payment intent IDs, we could theoretically fetch real-time status from Stripe
        // but for now, we return the internal record.

        const transactions = reservations.map(r => ({
            reservationId: r.id,
            date: r.date,
            customer: (r.users as any)?.name || 'Desconocido',
            email: (r.users as any)?.email,
            amount: r.deposit_amount,
            stripeId: r.payment_intent_id,
            status: 'succeeded' // Since deposit_paid is true
        }));

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error('Fetch transactions error:', error);
        res.status(500).json({ success: false, error: 'Error al obtener las transacciones' });
    }
});

export default router;
