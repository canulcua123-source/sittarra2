import { supabaseAdmin } from '../config/supabase.js';

export interface NotificationOptions {
    userId: string;
    type: 'reservation_confirmed' | 'reservation_reminder' | 'reservation_cancelled' | 'review_request' | 'offer' | 'system';
    title: string;
    message: string;
    data?: any;
}

export class NotificationService {
    /**
     * Create a notification for a user
     */
    static async createNotification(options: NotificationOptions): Promise<void> {
        try {
            const { error } = await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: options.userId,
                    type: options.type,
                    title: options.title,
                    message: options.message,
                    data: options.data || {},
                    is_read: false,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('[NotificationService] Error creating notification:', error);
            }
        } catch (error) {
            console.error('[NotificationService] Unexpected error:', error);
        }
    }

    /**
     * Trigger a review request notification
     */
    static async requestReview(userId: string, reservationId: string, restaurantName: string): Promise<void> {
        await this.createNotification({
            userId,
            type: 'review_request',
            title: '¿Qué te pareció tu visita?',
            message: `Gracias por visitarnos en ${restaurantName}. ¡Nos encantaría conocer tu opinión!`,
            data: { reservationId }
        });
    }
}
