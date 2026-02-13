import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/menu-categories/:restaurantId
 * Get all menu categories for a restaurant
 */
router.get('/:restaurantId', async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.params;

        const { data: categories, error } = await supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching menu categories:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching categories',
            });
            return;
        }

        res.json({
            success: true,
            data: categories || [],
        });
    } catch (error) {
        console.error('Get menu categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/menu-categories
 * Create a new menu category (restaurant admin only)
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { restaurantId, name, description, icon, sortOrder } = req.body;

        if (!restaurantId || !name) {
            res.status(400).json({
                success: false,
                error: 'restaurantId and name are required',
            });
            return;
        }

        // Verify ownership
        const { data: restaurant, error: rError } = await supabase
            .from('restaurants')
            .select('owner_id')
            .eq('id', restaurantId)
            .single();

        if (rError || !restaurant) {
            res.status(404).json({
                success: false,
                error: 'Restaurant not found',
            });
            return;
        }

        if (restaurant.owner_id !== req.user!.id && req.user!.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'Not authorized to manage this restaurant',
            });
            return;
        }

        // Check if category name already exists for this restaurant
        const { data: existing } = await supabase
            .from('menu_categories')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .eq('name', name)
            .single();

        if (existing) {
            res.status(400).json({
                success: false,
                error: 'Category with this name already exists',
            });
            return;
        }

        // Create category
        const { data: category, error } = await supabaseAdmin
            .from('menu_categories')
            .insert({
                restaurant_id: restaurantId,
                name,
                description: description || '',
                icon: icon || null,
                sort_order: sortOrder || 0,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating menu category:', error);
            res.status(500).json({
                success: false,
                error: 'Error creating category',
            });
            return;
        }

        res.status(201).json({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error('Create menu category error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * PATCH /api/menu-categories/:id
 * Update a menu category (restaurant admin only)
 */
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, icon, sortOrder, isActive } = req.body;

        // Get category and verify ownership
        const { data: category, error: fetchError } = await supabase
            .from('menu_categories')
            .select('*, restaurants(owner_id)')
            .eq('id', id)
            .single();

        if (fetchError || !category) {
            res.status(404).json({
                success: false,
                error: 'Category not found',
            });
            return;
        }

        const restaurant = category.restaurants as any;
        if (restaurant.owner_id !== req.user!.id && req.user!.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'Not authorized to manage this category',
            });
            return;
        }

        // Build update object
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (icon !== undefined) updates.icon = icon;
        if (sortOrder !== undefined) updates.sort_order = sortOrder;
        if (isActive !== undefined) updates.is_active = isActive;

        if (Object.keys(updates).length === 0) {
            res.status(400).json({
                success: false,
                error: 'No valid fields to update',
            });
            return;
        }

        // Update category
        const { data: updated, error } = await supabaseAdmin
            .from('menu_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating menu category:', error);
            res.status(500).json({
                success: false,
                error: 'Error updating category',
            });
            return;
        }

        res.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('Update menu category error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/menu-categories/:id
 * Delete a menu category (restaurant admin only)
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get category and verify ownership
        const { data: category, error: fetchError } = await supabase
            .from('menu_categories')
            .select('*, restaurants(owner_id)')
            .eq('id', id)
            .single();

        if (fetchError || !category) {
            res.status(404).json({
                success: false,
                error: 'Category not found',
            });
            return;
        }

        const restaurant = category.restaurants as any;
        if (restaurant.owner_id !== req.user!.id && req.user!.role !== 'super_admin') {
            res.status(403).json({
                success: false,
                error: 'Not authorized to manage this category',
            });
            return;
        }

        // Check if category has menu items
        const { data: menuItems } = await supabase
            .from('menu_items')
            .select('id')
            .eq('category', category.name)
            .eq('restaurant_id', category.restaurant_id);

        if (menuItems && menuItems.length > 0) {
            res.status(400).json({
                success: false,
                error: `Cannot delete category with ${menuItems.length} menu items. Please reassign or delete items first.`,
            });
            return;
        }

        // Delete category
        const { error } = await supabaseAdmin
            .from('menu_categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting menu category:', error);
            res.status(500).json({
                success: false,
                error: 'Error deleting category',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        console.error('Delete menu category error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;
