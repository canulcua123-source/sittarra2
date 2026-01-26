import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/notifications
 * Get all notifications for current user
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { limit = 20, offset = 0, type } = req.query;

        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', req.user!.id)
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (type && typeof type === 'string') {
            query = query.eq('type', type);
        }

        const { data: notifications, error, count } = await query;

        if (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching notifications',
            });
            return;
        }

        res.json({
            success: true,
            data: notifications,
            total: count,
            limit: Number(limit),
            offset: Number(offset),
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/notifications/unread
 * Get unread notifications count and list
 */
router.get('/unread', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { data: notifications, error, count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', req.user!.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching unread notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching unread notifications',
            });
            return;
        }

        res.json({
            success: true,
            data: notifications,
            unreadCount: count || 0,
        });
    } catch (error) {
        console.error('Get unread notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const { data: notification, error: fetchError } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user!.id)
            .single();

        if (fetchError || !notification) {
            res.status(404).json({
                success: false,
                error: 'Notification not found',
            });
            return;
        }

        // Update notification
        const { data: updated, error } = await supabaseAdmin
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                error: 'Error updating notification',
            });
            return;
        }

        res.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString(),
            })
            .eq('user_id', req.user!.id)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({
                success: false,
                error: 'Error updating notifications',
            });
            return;
        }

        res.json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const { data: notification, error: fetchError } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user!.id)
            .single();

        if (fetchError || !notification) {
            res.status(404).json({
                success: false,
                error: 'Notification not found',
            });
            return;
        }

        // Delete notification
        const { error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                success: false,
                error: 'Error deleting notification',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/notifications
 * Create a notification (internal use or admin)
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { userId, type, title, message, data } = req.body;

        // Only allow admins or system to create notifications for other users
        if (userId && userId !== req.user!.id && req.user!.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'Not authorized to create notifications for other users',
            });
            return;
        }

        const targetUserId = userId || req.user!.id;

        // Validate required fields
        if (!type || !title || !message) {
            res.status(400).json({
                success: false,
                error: 'type, title, and message are required',
            });
            return;
        }

        // Create notification
        const { data: notification, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: targetUserId,
                type,
                title,
                message,
                data: data || {},
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating notification:', error);
            res.status(500).json({
                success: false,
                error: 'Error creating notification',
            });
            return;
        }

        res.status(201).json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;
