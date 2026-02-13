import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import type { User } from '../types/database.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
            accessToken?: string;
        }
    }
}

/**
 * Middleware to verify Supabase JWT token
 * Extracts user from token and attaches to request
 */
export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No authorization token provided',
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        req.accessToken = token;

        let userId: string | undefined;

        try {
            // Try to verify as our custom JWT first
            const decoded = jwt.verify(token, env.jwtSecret) as any;
            userId = decoded.userId || decoded.id;
        } catch (jwtError) {
            // If not our JWT, try Supabase
            const { data: { user }, error: supabaseError } = await supabase.auth.getUser(token);
            if (!supabaseError && user) {
                userId = user.id;
            }
        }

        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
            });
            return;
        }

        // Get user profile from our users table
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !userProfile) {
            // If we don't have a profile yet but we have a valid token (probably from Supabase Auth)
            // we should try to create it or fail if we can't find it
            res.status(401).json({
                success: false,
                error: 'User profile not found',
            });
            return;
        } else {
            req.user = userProfile;
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error',
        });
    }
}

/**
 * Middleware to check if user is a restaurant admin
 */
export async function restaurantAdminMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
        return;
    }

    if (req.user.role !== 'restaurant_admin' && req.user.role !== 'super_admin') {
        res.status(403).json({
            success: false,
            error: 'Restaurant admin access required',
        });
        return;
    }

    next();
}

/**
 * Middleware to check if user owns the restaurant
 */
export function restaurantOwnerMiddleware(restaurantIdParam: string = 'restaurantId') {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
            return;
        }

        const restaurantId = req.params[restaurantIdParam];

        if (!restaurantId) {
            res.status(400).json({
                success: false,
                error: 'Restaurant ID is required',
            });
            return;
        }

        // Super admin can access any restaurant
        if (req.user.role === 'super_admin') {
            next();
            return;
        }

        // Check if user owns this restaurant
        const { data: restaurant, error } = await supabase
            .from('restaurants')
            .select('id, owner_id')
            .eq('id', restaurantId)
            .single();

        if (error || !restaurant) {
            res.status(404).json({
                success: false,
                error: 'Restaurant not found',
            });
            return;
        }

        if (restaurant.owner_id !== req.user.id) {
            res.status(403).json({
                success: false,
                error: 'You do not have access to this restaurant',
            });
            return;
        }

        next();
    };
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export async function optionalAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
    }

    try {
        const token = authHeader.split(' ')[1];
        req.accessToken = token;

        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
            const { data: userProfile } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (userProfile) {
                req.user = userProfile;
            }
        }
    } catch (error) {
        // Ignore errors in optional auth
        console.warn('Optional auth error:', error);
    }

    next();
}

/**
 * Middleware to check if user is restaurant staff
 * Staff can only access their assigned restaurant
 */
export async function staffMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
        return;
    }

    // Allow restaurant_admin and super_admin as well (they have more permissions than staff)
    const allowedRoles = ['staff', 'restaurant_admin', 'super_admin'];
    if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
            success: false,
            error: 'Staff access required',
        });
        return;
    }

    next();
}

/**
 * Middleware to verify staff belongs to a specific restaurant
 */
export function staffRestaurantMiddleware(restaurantIdParam: string = 'restaurantId') {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
            return;
        }

        const restaurantId = req.params[restaurantIdParam] || req.body.restaurantId || req.query[restaurantIdParam];

        if (!restaurantId) {
            res.status(400).json({
                success: false,
                error: 'Restaurant ID is required',
            });
            return;
        }

        // Super admin can access any restaurant
        if (req.user.role === 'super_admin') {
            next();
            return;
        }

        // Check if user is staff or admin of this restaurant
        const { data: staffRecord } = await supabase
            .from('restaurant_staff')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .single();

        // Also check if they're the owner
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('owner_id')
            .eq('id', restaurantId)
            .single();

        const isOwner = restaurant?.owner_id === req.user.id;
        const isStaff = !!staffRecord;

        if (!isOwner && !isStaff) {
            res.status(403).json({
                success: false,
                error: 'No tienes acceso a este restaurante',
            });
            return;
        }

        next();
    };
}

/**
 * Middleware for admin routes
 * Verifies JWT, checks admin role, and attaches restaurantId
 */
export async function authenticateAdmin(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No authorization token provided',
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        req.accessToken = token;

        let userId: string | undefined;
        let restaurantIdFromToken: string | undefined;

        try {
            // Try to verify as our custom JWT first
            const decoded = jwt.verify(token, env.jwtSecret) as any;
            userId = decoded.userId || decoded.id;
            // IMPORTANT: Get restaurantId from the token if available
            restaurantIdFromToken = decoded.restaurantId;
        } catch (jwtError) {
            // If not our JWT, try Supabase
            const { data: { user }, error: supabaseError } = await supabase.auth.getUser(token);
            if (!supabaseError && user) {
                userId = user.id;
            }
        }

        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
            });
            return;
        }

        // Get user profile
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !userProfile) {
            res.status(401).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        // Check if user is admin
        if (userProfile.role !== 'restaurant_admin' && userProfile.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'Admin access required',
            });
            return;
        }

        // Multi-restaurant logic: 
        // 1. Try to get restaurantId from X-Restaurant-Id header
        // 2. Fallback to restaurantId from token
        // 3. Last fallback: query the first restaurant owned by the user
        let restaurantId = req.headers['x-restaurant-id'] as string || restaurantIdFromToken;

        if (!restaurantId) {
            // Fallback: Get the most recently created restaurant owned by this admin
            const { data: restaurant } = await supabaseAdmin
                .from('restaurants')
                .select('id')
                .eq('owner_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            restaurantId = restaurant?.id;
        }

        // IMPORTANT: Security Validation
        // If not super_admin, verify the user actually owns or is staff of this specific restaurantId
        if (userProfile.role !== 'super_admin' && restaurantId) {
            // Check ownership
            const { data: isOwner } = await supabaseAdmin
                .from('restaurants')
                .select('id')
                .eq('id', restaurantId)
                .eq('owner_id', userId)
                .single();

            if (!isOwner) {
                // Check if staff
                const { data: isStaff } = await supabaseAdmin
                    .from('restaurant_staff')
                    .select('id')
                    .eq('restaurant_id', restaurantId)
                    .eq('user_id', userId)
                    .eq('is_active', true)
                    .single();

                if (!isStaff) {
                    res.status(403).json({
                        success: false,
                        error: 'Access denied for this restaurant',
                    });
                    return;
                }
            }
        }

        // Attach user and restaurantId to request
        (req as any).user = {
            ...userProfile,
            restaurantId: restaurantId
        };

        if (!restaurantId && userProfile.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'No restaurant associated with this account',
            });
            return;
        }

        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error',
        });
    }
}
