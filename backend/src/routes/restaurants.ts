import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { optionalAuthMiddleware, authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/restaurants
 * Get all restaurants with optional filters
 */
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const {
            search,
            zone,
            cuisine,
            priceRange,
            isOpen,
            hasOffers,
            lat,
            lng,
            radius = 10,
            limit = 20,
            offset = 0
        } = req.query;

        let query = supabaseAdmin
            .from('restaurants')
            .select('*', { count: 'exact' })
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // Apply filters
        if (search && typeof search === 'string') {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,cuisine_type.ilike.%${search}%`);
        }

        if (zone && zone !== 'Todos' && typeof zone === 'string') {
            query = query.eq('zone', zone);
        }

        if (cuisine && cuisine !== 'Todos' && typeof cuisine === 'string') {
            query = query.eq('cuisine_type', cuisine);
        }

        if (priceRange && typeof priceRange === 'string') {
            query = query.eq('price_range', priceRange);
        }

        // Geolocation Filter (Simple Bounding Box approx)
        if (lat && lng) {
            const latitude = parseFloat(lat as string);
            const longitude = parseFloat(lng as string);
            const rad = parseFloat(radius as string);

            // ~1 degree of latitude is approx 111km
            const latDelta = rad / 111;
            // ~1 degree of longitude varies, but at typical latitudes:
            const lngDelta = rad / (111 * Math.cos(latitude * (Math.PI / 180)));

            query = query
                .gte('latitude', latitude - latDelta)
                .lte('latitude', latitude + latDelta)
                .gte('longitude', longitude - lngDelta)
                .lte('longitude', longitude + lngDelta);
        }

        // Pagination
        query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

        const { data: restaurants, error, count } = await query;

        if (error) {
            console.error('Error fetching restaurants:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching restaurants',
            });
            return;
        }

        res.json({
            success: true,
            data: restaurants,
            total: count,
            limit: Number(limit),
            offset: Number(offset),
        });
    } catch (error) {
        console.error('Restaurants route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/featured
 * Get featured restaurants (high rating)
 */
router.get('/featured', async (req: Request, res: Response) => {
    try {
        const { data: restaurants, error } = await supabaseAdmin
            .from('restaurants')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching featured restaurants:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching featured restaurants',
            });
            return;
        }

        res.json({
            success: true,
            data: restaurants,
        });
    } catch (error) {
        console.error('Featured restaurants error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id
 * Get restaurant details
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: restaurant, error } = await supabaseAdmin
            .from('restaurants')
            .select(`
        *,
        tables (id, number, capacity, status),
        offers (*)
      `)
            .eq('id', id)
            .single();

        if (error || !restaurant) {
            res.status(404).json({
                success: false,
                error: 'Restaurant not found',
            });
            return;
        }

        // Get reviews separately with user info
        const { data: reviews } = await supabaseAdmin
            .from('reviews')
            .select(`
        *,
        users (id, name, avatar_url)
      `)
            .eq('restaurant_id', id)
            .order('created_at', { ascending: false });

        const restaurantWithReviews = {
            ...restaurant,
            reviews_list: reviews || [],
            average_rating: reviews && reviews.length > 0
                ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
                : 0,
            review_count: reviews ? reviews.length : 0
        };

        res.json({
            success: true,
            data: restaurantWithReviews,
        });
    } catch (error) {
        console.error('Get restaurant error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/tables
 * Get all tables for a restaurant
 */
router.get('/:id/tables', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: tables, error } = await supabaseAdmin
            .from('tables')
            .select('*')
            .eq('restaurant_id', id);

        if (error) {
            console.error('Error fetching tables:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching tables',
            });
            return;
        }

        res.json({
            success: true,
            data: tables,
        });
    } catch (error) {
        console.error('Get tables error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/tables/available
 * Get available tables for a restaurant at a specific date/time
 */
router.get('/:id/tables/available', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, time, guests } = req.query;

        if (!date || !time || !guests) {
            res.status(400).json({
                success: false,
                error: 'Date, time, and guests are required',
            });
            return;
        }

        const guestCount = parseInt(guests as string);

        // Get all tables for this restaurant that can fit the guests
        const { data: tables, error: tablesError } = await supabaseAdmin
            .from('tables')
            .select('*')
            .eq('restaurant_id', id)
            .gte('capacity', guestCount)
            .eq('is_active', true);

        if (tablesError) {
            console.error('Error fetching tables:', tablesError);
            res.status(500).json({ success: false, error: 'Error checking table availability' });
            return;
        }

        // Get reservations for the selected date and time
        const reservationDate = date as string;
        const reservationTime = time as string;

        const { data: reservations, error: reservationsError } = await supabaseAdmin
            .from('reservations')
            .select('table_id, status')
            .eq('restaurant_id', id)
            .eq('date', reservationDate)
            .eq('time', reservationTime)
            .not('status', 'in', '("cancelled", "no_show")');

        if (reservationsError) {
            console.error('Error fetching reservations:', reservationsError);
            res.status(500).json({ success: false, error: 'Error checking availability' });
            return;
        }

        // Filter out tables that are already reserved
        const reservedTableIds = reservations?.map((r: any) => r.table_id) || [];
        const availableTables = tables.filter((table: any) => !reservedTableIds.includes(table.id));

        res.json({
            success: true,
            data: availableTables,
        });
    } catch (error) {
        console.error('Get available tables error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/timeslots
 * Get available time slots for a specific date
 */
router.get('/:id/timeslots', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, guests } = req.query;

        if (!date || !guests) {
            res.status(400).json({
                success: false,
                error: 'Date and guests are required',
            });
            return;
        }

        // Standard time slots (in a real app, these would come from restaurant settings)
        const allTimeSlots = [
            '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
            '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
        ];

        // Filter based on restaurant opening hours (this is a simplified version)
        // In a real app, you'd check opening_hours and holidays here

        // For each time slot, check if ANY table is available
        const guestCount = parseInt(guests as string);

        // Get all tables for this restaurant that can fit the guests
        const { data: tables } = await supabaseAdmin
            .from('tables')
            .select('id')
            .eq('restaurant_id', id)
            .gte('capacity', guestCount)
            .eq('is_active', true);

        if (!tables || tables.length === 0) {
            res.json({ success: true, data: [] });
            return;
        }

        const tableIds = tables.map((t: any) => t.id);

        // Get all reservations for this date
        const { data: reservations } = await supabaseAdmin
            .from('reservations')
            .select('time, table_id')
            .eq('restaurant_id', id)
            .eq('date', date as string)
            .not('status', 'in', '("cancelled", "no_show")');

        const availableSlots = allTimeSlots.filter(slot => {
            const reservationsAtSlot = reservations?.filter((r: any) => r.time === slot) || [];
            const reservedTableIds = reservationsAtSlot.map((r: any) => r.table_id);
            // If there's at least one table not in reservedTableIds
            return tableIds.some(id => !reservedTableIds.includes(id));
        });

        res.json({
            success: true,
            data: availableSlots,
        });
    } catch (error) {
        console.error('Get timeslots error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/availability
 * Get full availability for a date range
 */
router.get('/:id/availability', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, guests } = req.query;

        if (!startDate || !endDate || !guests) {
            res.status(400).json({
                success: false,
                error: 'startDate, endDate and guests are required',
            });
            return;
        }

        // Get restaurant settings and holidays
        const { data: restaurant, error: restaurantError } = await supabaseAdmin
            .from('restaurants')
            .select('settings, opening_hours, holidays')
            .eq('id', id)
            .single();

        if (restaurantError || !restaurant) {
            res.status(404).json({ success: false, error: 'Restaurant not found' });
            return;
        }

        const settings = restaurant.settings || {};
        const openingHours = restaurant.opening_hours || {};
        const holidays = restaurant.holidays || [];

        // Simplified availability logic: for each day, check if it's a holiday or closed
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const availability = [];

        const guestCount = parseInt(guests as string);
        const { data: tables } = await supabaseAdmin
            .from('tables')
            .select('id')
            .eq('restaurant_id', id)
            .gte('capacity', guestCount)
            .eq('is_active', true);

        const tableIds = tables?.map((t: any) => t.id) || [];

        // Time slots to check
        const timeSlots = ['13:00', '14:00', '15:00', '19:00', '20:00', '21:00'];
        const depositHours = settings.depositHours || ['19:00', '19:30', '20:00', '20:30', '21:00'];

        // Get existing reservations for this date to check availability
        const { data: reservations } = await supabaseAdmin
            .from('reservations')
            .select('date, time, table_id')
            .eq('restaurant_id', id)
            .gte('date', startDate as string)
            .lte('date', endDate as string)
            .not('status', 'in', '("cancelled", "no_show")');

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

            const holiday = holidays.find((h: any) => h.date === dateStr);
            const isClosed = holiday?.closed || openingHours[dayName]?.closed;

            if (isClosed) {
                availability.push({
                    date: dateStr,
                    isClosed: true,
                    timeSlots: []
                });
                continue;
            }

            const slots = timeSlots.map(slot => {
                const reservationsAtSlot = reservations?.filter((r: any) => r.date === dateStr && r.time === slot) || [];
                const reservedTableIds = reservationsAtSlot.map((r: any) => r.table_id);
                const isAvailable = tableIds.some(id => !reservedTableIds.includes(id));

                return {
                    time: slot,
                    available: isAvailable,
                    requiresDeposit: depositHours.includes(slot) && settings.depositRequired
                };
            });

            availability.push({
                date: dateStr,
                isClosed: false,
                timeSlots: slots
            });
        }

        res.json({
            success: true,
            data: availability,
        });
    } catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/menu
 * Get restaurant menu (Flat list and Structured for Mobile)
 */
router.get('/:id/menu', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 1. Fetch categories for this restaurant
        const { data: categories, error: catError } = await supabaseAdmin
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', id)
            .order('sort_order', { ascending: true });

        // 2. Fetch menu items with optional dietary filters
        const { vegan, vegetarian, glutenFree } = req.query;
        let itemQuery = supabaseAdmin
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', id)
            .eq('is_available', true)
            .order('sort_order', { ascending: true });

        if (vegan === 'true') itemQuery = itemQuery.eq('is_vegan', true);
        if (vegetarian === 'true') itemQuery = itemQuery.eq('is_vegetarian', true);
        if (glutenFree === 'true') itemQuery = itemQuery.eq('is_gluten_free', true);

        const { data: menuItems, error: itemError } = await itemQuery;

        if (catError || itemError) {
            console.error('Error fetching menu:', catError || itemError);
            res.status(500).json({
                success: false,
                error: 'Error al cargar el menú',
                details: catError || itemError
            });
            return;
        }

        // Group items by category logic
        let structuredMenu = [];

        if (categories && categories.length > 0) {
            // Priority: Group by defined categories
            structuredMenu = categories.map(cat => ({
                ...cat,
                items: menuItems?.filter(item =>
                    item.category === cat.name || item.subcategory === cat.name
                ) || []
            }));

            // Add items that didn't match any category
            const categorizedIds = new Set(structuredMenu.flatMap(c => c.items.map((i: any) => i.id)));
            const others = menuItems?.filter(i => !categorizedIds.has(i.id)) || [];
            if (others.length > 0) {
                structuredMenu.push({
                    id: 'others',
                    name: 'Otros',
                    items: others,
                    sort_order: 99,
                    restaurant_id: id,
                    is_active: true,
                    created_at: new Date().toISOString()
                } as any);
            }
        } else if (menuItems && menuItems.length > 0) {
            // Fallback: Group by category string field in menu_items
            const groups: Record<string, any[]> = {};
            menuItems.forEach(item => {
                const catName = item.category || 'Sin Categoría';
                if (!groups[catName]) groups[catName] = [];
                groups[catName].push(item);
            });

            structuredMenu = Object.keys(groups).map(catName => ({
                id: catName,
                name: catName,
                items: groups[catName],
                sort_order: 0,
                is_active: true,
                restaurant_id: id,
                created_at: new Date().toISOString()
            }));
        }

        res.json({
            success: true,
            data: menuItems, // Compatibilidad
            structuredMenu: structuredMenu // Fase 4
        });
    } catch (error) {
        console.error('Get menu error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/menu/highlights
 * Get recommended or new menu items (for showcased items)
 */
router.get('/:id/menu/highlights', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: highlights, error } = await supabaseAdmin
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', id)
            .eq('is_available', true)
            .or('is_highlighted.eq.true,is_new.eq.true')
            .limit(10);

        if (error) {
            console.error('Error fetching highlights:', error);
            res.status(500).json({ success: false, error: 'Error fetching featured items' });
            return;
        }

        res.json({ success: true, data: highlights });
    } catch (error) {
        console.error('Highlights error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


/**
 * GET /api/restaurants/:id/offers
 * Get restaurant active offers
 */
router.get('/:id/offers', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const { data: offers, error } = await supabaseAdmin
            .from('offers')
            .select('*')
            .eq('restaurant_id', id)
            .eq('is_active', true)
            .lte('start_date', today)
            .gte('end_date', today);

        if (error) {
            console.error('Error fetching offers:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching offers',
            });
            return;
        }

        res.json({
            success: true,
            data: offers,
        });
    } catch (error) {
        console.error('Get offers error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/admin/reservations
 * Admin route to get all reservations for their restaurant
 */
router.get('/:id/admin/reservations', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, date } = req.query;

        // Verify ownership
        const { data: restaurant, error: rError } = await supabaseAdmin
            .from('restaurants')
            .select('owner_id')
            .eq('id', id)
            .single();

        if (rError || !restaurant) {
            return res.status(404).json({ success: false, error: 'Restaurant not found' });
        }

        // Allow owner or super_admin
        if (restaurant.owner_id !== req.user!.id && req.user!.role !== 'super_admin') {
            // Check if user is staff (optional, depending on requirements)
            const { data: staff } = await supabaseAdmin
                .from('restaurant_staff')
                .select('id')
                .eq('restaurant_id', id)
                .eq('user_id', req.user!.id)
                .single();

            if (!staff) {
                return res.status(403).json({ success: false, error: 'Unauthorized access to restaurant bookings' });
            }
        }

        let query = supabaseAdmin
            .from('reservations')
            .select(`
                *,
                users (id, name, email, phone, avatar_url),
                tables (id, number, name)
            `)
            .eq('restaurant_id', id)
            .order('date', { ascending: false })
            .order('time', { ascending: false });

        if (status) {
            query = query.eq('status', status as string);
        }

        if (date) {
            query = query.eq('date', date as string);
        }

        const { data: reservations, error } = await query;

        if (error) {
            console.error('Error fetching admin reservations:', error);
            res.status(500).json({ success: false, error: 'Error fetching reservations' });
            return;
        }

        res.json({
            success: true,
            data: reservations,
        });
    } catch (error) {
        console.error('Admin reservations error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/reservations
 * Alias endpoint for admin reservations (backwards compatibility)
 */
router.get('/:id/reservations', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, date } = req.query;

        console.log('[RESERVATIONS DEBUG] Getting reservations for restaurant:', id);

        // Verify ownership
        const { data: restaurant, error: rError } = await supabaseAdmin
            .from('restaurants')
            .select('owner_id')
            .eq('id', id)
            .single();

        if (rError || !restaurant) {
            return res.status(404).json({ success: false, error: 'Restaurant not found' });
        }

        // Allow owner, super_admin, or staff
        if (restaurant.owner_id !== req.user!.id && req.user!.role !== 'super_admin') {
            const { data: staff } = await supabaseAdmin
                .from('restaurant_staff')
                .select('id')
                .eq('restaurant_id', id)
                .eq('user_id', req.user!.id)
                .single();

            if (!staff) {
                return res.status(403).json({ success: false, error: 'Unauthorized access to restaurant bookings' });
            }
        }

        let query = supabaseAdmin
            .from('reservations')
            .select(`
                *,
                users (id, name, email, phone, avatar_url),
                tables (id, number, name)
            `)
            .eq('restaurant_id', id)
            .order('date', { ascending: false })
            .order('time', { ascending: false });

        if (status) {
            query = query.eq('status', status as string);
        }

        if (date) {
            query = query.eq('date', date as string);
        }

        const { data: reservations, error } = await query;

        if (error) {
            console.error('[RESERVATIONS DEBUG] Error fetching reservations:', error);
            res.status(500).json({ success: false, error: 'Error fetching reservations' });
            return;
        }

        console.log('[RESERVATIONS DEBUG] Found reservations:', reservations?.length || 0);

        res.json({
            success: true,
            data: reservations || [],
        });
    } catch (error) {
        console.error('Restaurant reservations error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * PATCH /api/restaurants/:id/admin/settings
 * Admin route to update restaurant settings
 */
router.patch('/:id/admin/settings', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Verify ownership
        const { data: restaurant, error: rError } = await supabaseAdmin
            .from('restaurants')
            .select('owner_id')
            .eq('id', id)
            .single();

        if (rError || !restaurant) {
            return res.status(404).json({ success: false, error: 'Restaurant not found' });
        }

        if (restaurant.owner_id !== req.user!.id && req.user!.role !== 'super_admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized to modify restaurant settings' });
        }

        // Whitelist allowed update fields
        const allowedFields = [
            'name', 'description', 'address', 'phone', 'email', 'website',
            'instagram', 'facebook', 'cuisine_type', 'zone', 'price_range',
            'image_url', 'is_active', 'open_time', 'close_time',
            'opening_hours', 'settings', 'holidays', 'latitude', 'longitude'
        ];

        const filteredUpdates: any = {};
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields provided for update' });
        }

        // Update restaurant
        const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
            .from('restaurants')
            .update(filteredUpdates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating restaurant settings:', updateError);
            res.status(500).json({ success: false, error: 'Error updating restaurant settings' });
            return;
        }

        res.json({
            success: true,
            data: updatedRestaurant,
            message: 'Restaurant settings updated successfully',
        });
    } catch (error) {
        console.error('Admin settings update error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;
