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

        let query = supabase
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
        const { data: restaurants, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(4);

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
        console.error('Featured restaurants route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id
 * Get restaurant by ID with related data
 */
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: restaurant, error } = await supabase
            .from('restaurants')
            .select(`
        *,
        tables (*),
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
        const { data: reviews } = await supabase
            .from('reviews')
            .select(`
        *,
        users (id, name, avatar_url)
      `)
            .eq('restaurant_id', id)
            .order('created_at', { ascending: false })
            .limit(10);

        // Calculate average rating
        let averageRating = 0;
        if (reviews && reviews.length > 0) {
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            averageRating = totalRating / reviews.length;
        }

        res.json({
            success: true,
            data: {
                ...restaurant,
                reviews: reviews || [],
                averageRating: Math.round(averageRating * 10) / 10,
                reviewCount: reviews?.length || 0,
            },
        });
    } catch (error) {
        console.error('Restaurant detail route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/tables
 * Get tables for a restaurant
 */
router.get('/:id/tables', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: tables, error } = await supabase
            .from('tables')
            .select('*')
            .eq('restaurant_id', id)
            .order('number', { ascending: true });

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
        console.error('Tables route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/tables/available
 * Get available tables for a specific date, time, and guest count
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
        const { data: tables, error: tablesError } = await supabase
            .from('tables')
            .select('*')
            .eq('restaurant_id', id)
            .gte('capacity', guestCount)
            .order('number', { ascending: true });

        if (tablesError) {
            console.error('Error fetching tables:', tablesError);
            res.status(500).json({
                success: false,
                error: 'Error fetching tables',
            });
            return;
        }

        // Get reservations for this date and time (2-hour window)
        const reservationDate = date as string;
        const reservationTime = time as string;

        const { data: reservations, error: reservationsError } = await supabase
            .from('reservations')
            .select('table_id, status')
            .eq('restaurant_id', id)
            .eq('date', reservationDate)
            .in('status', ['pending', 'confirmed', 'arrived']);

        if (reservationsError) {
            console.error('Error fetching reservations:', reservationsError);
        }

        // Mark tables as available, reserved, or occupied
        const tablesWithStatus = tables.map(table => {
            const reservation = reservations?.find(r => r.table_id === table.id);

            let availabilityStatus = 'available';
            if (reservation) {
                if (reservation.status === 'arrived') {
                    availabilityStatus = 'occupied';
                } else {
                    availabilityStatus = 'reserved';
                }
            } else if (table.status === 'disabled') {
                availabilityStatus = 'blocked';
            }

            return {
                ...table,
                availability_status: availabilityStatus,
                is_selectable: availabilityStatus === 'available'
            };
        });

        res.json({
            success: true,
            data: tablesWithStatus,
            meta: {
                date: reservationDate,
                time: reservationTime,
                guests: guestCount,
                total_tables: tablesWithStatus.length,
                available_tables: tablesWithStatus.filter(t => t.availability_status === 'available').length
            }
        });
    } catch (error) {
        console.error('Available tables route error:', error);
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
        const { date } = req.query;

        if (!date) {
            res.status(400).json({
                success: false,
                error: 'Date parameter is required',
            });
            return;
        }

        // Get restaurant settings and holidays
        const { data: restaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .select('settings, opening_hours, holidays')
            .eq('id', id)
            .single();

        if (restaurantError || !restaurant) {
            res.status(404).json({
                success: false,
                error: 'Restaurant not found',
            });
            return;
        }

        // Check for holidays
        const holidays = restaurant.holidays || [];
        const isHoliday = holidays.some((h: any) => h.date === date && h.closed);

        if (isHoliday) {
            res.json({
                success: true,
                data: [],
                message: 'Restaurant is closed on this date'
            });
            return;
        }

        const settings = restaurant.settings || {};
        const depositRequired = settings.depositRequired || false;
        const depositAmount = settings.depositAmount || 200;
        const depositHours = settings.depositHours || ['19:00', '19:30', '20:00', '20:30', '21:00'];

        // Get existing reservations for this date to check availability
        const { data: reservations } = await supabase
            .from('reservations')
            .select('time')
            .eq('restaurant_id', id)
            .eq('date', date)
            .in('status', ['pending', 'confirmed', 'arrived']);

        const reservedTimes = new Set(reservations?.map(r => r.time) || []);

        // Generate time slots from 13:00 to 22:00 (every 30 minutes)
        const timeSlots = [];
        for (let hour = 13; hour <= 22; hour++) {
            for (const minutes of ['00', '30']) {
                if (hour === 22 && minutes === '30') continue; // Skip 22:30

                const time = `${hour.toString().padStart(2, '0')}:${minutes}`;
                const isDepositHour = depositRequired && depositHours.includes(time);

                timeSlots.push({
                    time,
                    available: !reservedTimes.has(time + ':00') && !reservedTimes.has(time),
                    requiresDeposit: isDepositHour,
                    depositAmount: isDepositHour ? depositAmount : 0,
                    isPeakHour: ['19:00', '19:30', '20:00', '20:30', '21:00'].includes(time),
                });
            }
        }

        res.json({
            success: true,
            data: timeSlots,
        });
    } catch (error) {
        console.error('Timeslots route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/availability
 * Get availability over a range of dates
 */
router.get('/:id/availability', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, guests } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required',
            });
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const guestCount = parseInt(guests as string || '2');

        // Limit range to 14 days for performance
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 14) {
            return res.status(400).json({
                success: false,
                error: 'Range cannot exceed 14 days',
            });
        }

        // Get restaurant info
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('opening_hours, settings, holidays')
            .eq('id', id)
            .single();

        const holidays = restaurant?.holidays || [];

        // Get all reservations in this range
        const { data: reservations } = await supabase
            .from('reservations')
            .select('date, time')
            .eq('restaurant_id', id)
            .gte('date', startDate as string)
            .lte('date', endDate as string)
            .in('status', ['pending', 'confirmed', 'arrived']);

        const results = [];
        const current = new Date(start);

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            const isHoliday = holidays.some((h: any) => h.date === dateStr && h.closed);

            const dailyReserved = reservations?.filter(r => r.date === dateStr).map(r => r.time) || [];

            // Simple slot logic (can be more complex based on table capacity)
            const availableSlots = [];

            if (!isHoliday) {
                for (let h = 13; h <= 22; h++) {
                    const clock = `${h.toString().padStart(2, '0')}:00`;
                    const clockHalf = `${h.toString().padStart(2, '0')}:30`;

                    if (!dailyReserved.includes(clock)) availableSlots.push(clock);
                    if (!dailyReserved.includes(clockHalf)) availableSlots.push(clockHalf);
                }
            }

            results.push({
                date: dateStr,
                available: availableSlots.length > 0,
                slots: availableSlots
            });

            current.setDate(current.getDate() + 1);
        }

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Availability range error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/restaurants/:id/menu
 * Get menu items for a restaurant
 */
router.get('/:id/menu', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: menuItems, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', id)
            .eq('is_available', true)
            .order('category', { ascending: true });

        if (error) {
            console.error('Error fetching menu:', error);
            res.status(500).json({
                success: false,
                error: 'Error fetching menu',
            });
            return;
        }

        res.json({
            success: true,
            data: menuItems,
        });
    } catch (error) {
        console.error('Menu route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/offers
 * Get active offers for a restaurant
 */
router.get('/:id/offers', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const { data: offers, error } = await supabase
            .from('offers')
            .select('*')
            .eq('restaurant_id', id)
            .eq('is_active', true)
            .gte('valid_until', today)
            .order('created_at', { ascending: false });

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
        console.error('Offers route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/restaurants/:id/reservations
 * Get reservations for a restaurant (protected)
 */
router.get('/:id/reservations', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, date } = req.query;

        // Verify ownership
        const { data: restaurant, error: rError } = await supabase
            .from('restaurants')
            .select('owner_id')
            .eq('id', id)
            .single();

        if (rError || !restaurant) {
            res.status(404).json({ success: false, error: 'Restaurant not found' });
            return;
        }

        // Allow owner or super_admin
        if (restaurant.owner_id !== req.user!.id && req.user!.role !== 'super_admin') {
            // Check if user is staff (optional, depending on requirements)
            const { data: staff } = await supabase
                .from('restaurant_staff')
                .select('id')
                .eq('restaurant_id', id)
                .eq('user_id', req.user!.id)
                .single();

            if (!staff) {
                res.status(403).json({ success: false, error: 'Unauthorized access to restaurant reservations' });
                return;
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

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (date && date !== 'all') {
            query = query.eq('date', date);
        }

        const { data: reservations, error } = await query;

        if (error) {
            console.error('Error fetching reservations:', error);
            res.status(500).json({ success: false, error: 'Error fetching reservations' });
            return;
        }

        res.json({ success: true, data: reservations });
    } catch (error) {
        console.error('Restaurant reservations error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * PATCH /api/restaurants/:id
 * Update restaurant information (owner only)
 */
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Verify ownership
        const { data: restaurant, error: rError } = await supabase
            .from('restaurants')
            .select('owner_id')
            .eq('id', id)
            .single();

        if (rError || !restaurant) {
            res.status(404).json({ success: false, error: 'Restaurant not found' });
            return;
        }

        // Only allow owner to update
        if (restaurant.owner_id !== req.user!.id && req.user!.role !== 'super_admin') {
            res.status(403).json({ success: false, error: 'Unauthorized to update this restaurant' });
            return;
        }

        // Allowed fields to update (must match actual database columns)
        const allowedFields = [
            'name',
            'description',
            'image',
            'image_url',
            'cuisine_type',
            'price_range',
            'open_time',
            'close_time',
            'has_deposit',
            'address',
            'zone',
            'phone',
            'email',
            'settings'  // JSONB field containing depositAmount, depositHours, depositRequired, maxPartySize
        ];

        // Map frontend camelCase to database snake_case
        const fieldMapping: Record<string, string> = {
            'cuisine': 'cuisine_type',
            'priceRange': 'price_range',
            'openTime': 'open_time',
            'closeTime': 'close_time',
            'maxGuestCount': 'max_guest_count',
            'hasDeposit': 'has_deposit'
        };

        // Convert frontend fields to backend fields
        const mappedUpdates: any = {};
        for (const [key, value] of Object.entries(updates)) {
            const mappedKey = fieldMapping[key] || key;
            mappedUpdates[mappedKey] = value;
        }

        // Filter updates to only include allowed fields
        const filteredUpdates: any = {};
        for (const field of allowedFields) {
            if (mappedUpdates[field] !== undefined) {
                filteredUpdates[field] = mappedUpdates[field];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            res.status(400).json({ success: false, error: 'No valid fields to update' });
            return;
        }

        // Update restaurant
        const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
            .from('restaurants')
            .update(filteredUpdates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating restaurant:', updateError);
            res.status(500).json({ success: false, error: 'Error updating restaurant' });
            return;
        }

        res.json({
            success: true,
            data: updatedRestaurant,
            message: 'Restaurant updated successfully'
        });
    } catch (error) {
        console.error('Update restaurant error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
