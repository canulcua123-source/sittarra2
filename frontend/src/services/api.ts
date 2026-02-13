/**
 * API Service Layer
 * 
 * This module provides a clean abstraction layer for all API calls.
 * Connects to the real backend API at http://localhost:3001
 */

import {
    Restaurant,
    Table,
    Reservation,
    Offer,
    Review,
    User,
    WaitlistEntry,
    MenuItem,
    TimeSlot,
    DashboardMetrics,
    AISuggestion,
    ApiResponse,
    RestaurantFilters,
    ReservationFilters
} from '@/types';

// Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

// Helper function for API calls
async function apiCall<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Get auth token - smart selection based on endpoint
    let token = null;

    // Determine if this is an admin/restaurant operation based on endpoint
    const isAdminOperation = (endpoint.includes('/restaurants/') || endpoint.includes('/offers/') || endpoint.includes('/admin/')) &&
        (options?.method === 'POST' || options?.method === 'PATCH' || options?.method === 'PUT' || options?.method === 'DELETE');

    if (isAdminOperation) {
        // For admin operations, try restaurant session first
        const restaurantSession = localStorage.getItem('mesafeliz_restaurant_session');
        if (restaurantSession) {
            try {
                const session = JSON.parse(restaurantSession);
                token = session.token;
            } catch (e) {
                console.error('Error parsing restaurant session:', e);
            }
        }
    }

    // If no token yet, try user token
    if (!token) {
        token = localStorage.getItem('mesafeliz_token');
    }

    // Final fallback to restaurant session if still no token
    if (!token) {
        const restaurantSession = localStorage.getItem('mesafeliz_restaurant_session');
        if (restaurantSession) {
            try {
                const session = JSON.parse(restaurantSession);
                token = session.token;
            } catch (e) {
                console.error('Error parsing restaurant session:', e);
            }
        }
    }

    // Get restaurant info if available to inject X-Restaurant-Id
    let activeRestaurantId = null;
    const restaurantSession = localStorage.getItem('mesafeliz_restaurant_session');
    if (restaurantSession) {
        try {
            const session = JSON.parse(restaurantSession);
            activeRestaurantId = session.restaurant?.id || session.restaurantId;
        } catch (e) {
            console.error('Error parsing restaurant session:', e);
        }
    }

    // Extract headers from options to prevent overwriting
    const { headers: customHeaders, ...restOptions } = options || {};

    const response = await fetch(url, {
        ...restOptions,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...(activeRestaurantId && { 'X-Restaurant-Id': activeRestaurantId }),
            ...(customHeaders as Record<string, string>),
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'API request failed');
    }

    return data.data;
}

// Transform backend data to frontend format
function transformRestaurant(data: any): Restaurant {
    if (!data) return {} as Restaurant;

    // Handle cases where joined data might come as an array (common in some PostgREST/Supabase joins)
    const item = Array.isArray(data) ? data[0] : data;

    // Parse settings JSONB for deposit and other config
    const settings = item.settings || {};

    return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        image: item.image || item.image_url || '/placeholder-restaurant.jpg',
        rating: item.rating || item.averageRating || 0,
        reviewCount: item.review_count || item.reviewCount || 0,
        cuisine: item.cuisine || item.cuisine_type || 'General',
        zone: item.zone || 'Centro',
        priceRange: item.price_range || item.priceRange || '$$',
        isOpen: item.is_open !== false,
        openTime: item.open_time || item.openTime || '12:00',
        closeTime: item.close_time || item.closeTime || '23:00',
        address: item.address || '',
        phone: item.phone,
        email: item.email,
        hasOffers: item.has_offers || (Array.isArray(item.offers) && item.offers.length > 0),
        offerText: item.offer_text || (Array.isArray(item.offers) && item.offers.length > 0 ? item.offers[0].title : undefined),
        // Deposit configuration from settings JSONB
        hasDeposit: settings.depositRequired || false,
        depositAmount: settings.depositAmount || 200,
        maxGuestCount: settings.maxPartySize || item.max_guest_count || 12,
        // Include raw settings for admin use
        settings: settings,
    };
}

function transformTable(data: any): Table & { availability_status?: string; is_selectable?: boolean } {
    return {
        id: data.id,
        restaurantId: data.restaurant_id,
        number: data.number,
        capacity: data.capacity,
        status: mapTableStatus(data.status || data.availability_status || 'available'),
        x: data.position_x || 0,
        y: data.position_y || 0,
        shape: data.shape || 'round',
        width: data.width || 60,
        height: data.height || 60,
        // For reservation page compatibility
        availability_status: data.availability_status || 'available',
        is_selectable: data.is_selectable !== undefined ? data.is_selectable : true,
        zone: data.zone || 'main',
    };
}

function mapTableStatus(status: string): Table['status'] {
    const statusMap: Record<string, Table['status']> = {
        'available': 'disponible',
        'occupied': 'ocupada',
        'reserved': 'reservada',
        'pending': 'pendiente',
        'disabled': 'deshabilitada',
    };
    return statusMap[status] || 'disponible';
}

function transformReservation(data: any): Reservation {
    // Handle joined user data - backend returns 'users' not 'user'
    const userData = data.users || data.user;
    // Handle joined table data - backend returns 'tables' not 'table'
    const tableData = data.tables || data.table;

    return {
        id: data.id,
        restaurantId: data.restaurant_id,
        userId: data.user_id,
        tableId: data.table_id,
        date: data.date,
        time: data.time,
        guestCount: data.guest_count,
        status: data.status,
        customerName: data.customer_name || userData?.name || 'Cliente',
        customerEmail: data.customer_email || userData?.email,
        customerPhone: data.customer_phone || userData?.phone,
        occasion: data.occasion,
        specialRequest: data.special_request,
        depositAmount: data.deposit_amount,
        depositPaid: data.deposit_paid,
        qrCode: data.qr_code,
        createdAt: data.created_at,
        hasReview: data.has_review || false,
        // Include table info for display
        table: tableData ? {
            id: tableData.id,
            restaurantId: data.restaurant_id,
            number: tableData.number,
            capacity: tableData.capacity,
            status: 'disponible' as const,
            x: 0,
            y: 0,
            shape: 'round' as const,
            width: 60,
            height: 60,
            zone: 'main' as const,
        } : undefined,
    };
}

function transformOffer(data: any): Offer {
    return {
        id: data.id,
        restaurantId: data.restaurant_id,
        title: data.title,
        description: data.description || '',
        discount: data.discount_value,
        discountType: data.discount_type,
        validFrom: data.valid_from,
        validUntil: data.valid_until,
        isActive: data.is_active,
        usageCount: data.usage_count || 0,
        maxUsage: data.max_usage,
        conditions: data.conditions,
    };
}

function transformMenuItem(data: any): MenuItem {
    return {
        id: data.id,
        restaurantId: data.restaurant_id,
        name: data.name,
        description: data.description || '',
        price: data.price,
        category: data.category,
        image: data.image_url,
        isHighlighted: data.is_highlighted,
        isAvailable: data.is_available,
    };
}

// ============================================
// RESTAURANT SERVICES
// ============================================

export const restaurantService = {
    async getAll(filters?: RestaurantFilters): Promise<Restaurant[]> {
        const params = new URLSearchParams();

        if (filters?.search) params.append('search', filters.search);
        if (filters?.zone && filters.zone !== 'Todos') params.append('zone', filters.zone);
        if (filters?.cuisine && filters.cuisine !== 'Todos') params.append('cuisine', filters.cuisine);
        if (filters?.priceRange) params.append('priceRange', filters.priceRange);
        if (filters?.isOpen !== undefined) params.append('isOpen', String(filters.isOpen));
        if (filters?.hasOffers) params.append('hasOffers', 'true');

        const queryString = params.toString();
        const endpoint = `/restaurants${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const json = await response.json();

        if (!json.success) {
            throw new Error(json.error || 'Failed to fetch restaurants');
        }

        return (json.data || []).map(transformRestaurant);
    },

    async getById(id: string): Promise<Restaurant | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/restaurants/${id}`);
            const json = await response.json();

            if (!json.success || !json.data) {
                return null;
            }

            return transformRestaurant(json.data);
        } catch (error) {
            console.error('Error fetching restaurant:', error);
            return null;
        }
    },

    async getFeatured(): Promise<Restaurant[]> {
        const response = await fetch(`${API_BASE_URL}/restaurants/featured`);
        const json = await response.json();

        if (!json.success) {
            throw new Error(json.error || 'Failed to fetch featured restaurants');
        }

        return (json.data || []).map(transformRestaurant);
    },

    async update(id: string, updates: Partial<Restaurant>): Promise<Restaurant> {
        // Map frontend camelCase to backend snake_case
        const backendUpdates: Record<string, any> = {};

        if (updates.name !== undefined) backendUpdates.name = updates.name;
        if (updates.description !== undefined) backendUpdates.description = updates.description;
        if (updates.cuisine !== undefined) backendUpdates.cuisine_type = updates.cuisine;
        if (updates.priceRange !== undefined) backendUpdates.price_range = updates.priceRange;
        if (updates.image !== undefined) backendUpdates.image_url = updates.image;
        if (updates.openTime !== undefined) backendUpdates.open_time = updates.openTime;
        if (updates.closeTime !== undefined) backendUpdates.close_time = updates.closeTime;

        // Build settings object for JSONB update
        const settingsUpdates: Record<string, any> = {};
        if ((updates as any).maxGuestCount !== undefined) settingsUpdates.maxPartySize = (updates as any).maxGuestCount;
        if ((updates as any).hasDeposit !== undefined) settingsUpdates.depositRequired = (updates as any).hasDeposit;
        if ((updates as any).depositAmount !== undefined) settingsUpdates.depositAmount = (updates as any).depositAmount;
        if ((updates as any).depositHours !== undefined) settingsUpdates.depositHours = (updates as any).depositHours;

        // Only include settings if there are updates
        if (Object.keys(settingsUpdates).length > 0) {
            // Get current settings first to merge
            const currentSettings = (updates as any).settings || {};
            backendUpdates.settings = { ...currentSettings, ...settingsUpdates };
        }

        const data = await apiCall<any>(`/restaurants/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(backendUpdates),
        });
        return transformRestaurant(data);
    },
};

// ============================================
// TABLE SERVICES
// ============================================

export const tableService = {
    async getByRestaurant(restaurantId: string): Promise<Table[]> {
        const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/tables`);
        const json = await response.json();

        if (!json.success) {
            throw new Error(json.error || 'Failed to fetch tables');
        }

        return (json.data || []).map(transformTable);
    },

    async updateStatus(tableId: string, status: Table['status']): Promise<Table> {
        const backendStatus = mapFrontendStatusToBackend(status);

        // Use the admin/mesas endpoint which already exists
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/mesas/${tableId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ status: backendStatus }),
        });
        const json = await response.json();
        if (!json.success) throw new Error(json.error || 'Failed to update table status');
        return transformTable(json.data);
    },

    async getAvailable(restaurantId: string, date: string, time: string, guestCount: number): Promise<Table[]> {
        const params = new URLSearchParams({ date, time, guests: String(guestCount) });
        const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/tables/available?${params}`);
        const json = await response.json();

        if (!json.success) {
            throw new Error(json.error || 'Failed to fetch available tables');
        }

        return (json.data || []).map(transformTable);
    },

    // Admin Methods
    async create(table: Partial<Table>): Promise<Table> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/mesas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({
                number: table.number,
                capacity: table.capacity,
                shape: table.shape,
                position_x: table.x,
                position_y: table.y,
                zone: 'main',
                is_vip: false
            }),
        });
        const json = await response.json();
        if (!json.success) throw new Error(json.error || 'Failed to create table');
        return transformTable(json.data);
    },

    async update(tableId: string, updates: Partial<Table>): Promise<Table> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const backendUpdates: any = {};
        if (updates.number !== undefined) backendUpdates.number = updates.number;
        if (updates.capacity !== undefined) backendUpdates.capacity = updates.capacity;
        if (updates.shape !== undefined) backendUpdates.shape = updates.shape;
        if (updates.x !== undefined) backendUpdates.position_x = updates.x;
        if (updates.y !== undefined) backendUpdates.position_y = updates.y;
        if (updates.status !== undefined) backendUpdates.status = mapFrontendStatusToBackend(updates.status);

        const response = await fetch(`${API_BASE_URL}/admin/mesas/${tableId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(backendUpdates),
        });
        const json = await response.json();
        if (!json.success) throw new Error(json.error || 'Failed to update table');
        return transformTable(json.data);
    },

    async delete(tableId: string): Promise<void> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/mesas/${tableId}`, {
            method: 'DELETE',
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
        const json = await response.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete table');
    },
};

function mapFrontendStatusToBackend(status: Table['status']): string {
    const statusMap: Record<Table['status'], string> = {
        'disponible': 'available',
        'ocupada': 'occupied',
        'reservada': 'reserved',
        'pendiente': 'pending',
        'deshabilitada': 'disabled',
    };
    return statusMap[status] || 'available';
}

// ============================================
// RESERVATION SERVICES
// ============================================

export const reservationService = {
    async create(reservation: Omit<Reservation, 'id' | 'qrCode' | 'createdAt'>): Promise<Reservation> {
        const data = await apiCall<any>('/reservations', {
            method: 'POST',
            body: JSON.stringify({
                restaurantId: reservation.restaurantId,
                tableId: reservation.tableId,
                date: reservation.date,
                time: reservation.time,
                guestCount: reservation.guestCount,
                occasion: reservation.occasion,
                specialRequest: reservation.specialRequest,
            }),
        });
        return transformReservation(data);
    },

    async getByUser(userId: string): Promise<Reservation[]> {
        const data = await apiCall<any>('/reservations/my', {
            method: 'GET',
        });
        return (data || []).map(transformReservation);
    },

    async getByRestaurant(restaurantId: string, filters?: ReservationFilters): Promise<Reservation[]> {
        const params = new URLSearchParams();
        if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters?.date) params.append('date', filters.date);

        const queryString = params.toString();
        const endpoint = `/restaurants/${restaurantId}/reservations${queryString ? `?${queryString}` : ''}`;

        // Get admin token
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
        const json = await response.json();

        if (!json.success) {
            return [];
        }

        return (json.data || []).map(transformReservation);
    },

    async updateStatus(reservationId: string, status: Reservation['status']): Promise<Reservation> {
        // Get admin token
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const adminToken = session ? JSON.parse(session).token : null;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
        }

        // Use admin endpoints for restaurant-specific operations to verify ownership
        if (adminToken && (status === 'confirmed' || status === 'cancelled')) {
            const adminEndpoint = status === 'confirmed'
                ? `/admin/reservas/${reservationId}/aceptar`
                : `/admin/reservas/${reservationId}/cancelar`;

            const response = await fetch(`${API_BASE_URL}${adminEndpoint}`, {
                method: 'PATCH',
                headers,
                body: status === 'cancelled' ? JSON.stringify({ reason: 'Rechazada por el restaurante' }) : undefined,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            const json = await response.json();
            if (!json.success) {
                throw new Error(json.error || 'Failed to update reservation status');
            }
            return transformReservation(json.data);
        }

        // For other statuses, use the generic endpoint
        const data = await apiCall<any>(`/reservations/${reservationId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
            headers
        });
        return transformReservation(data);
    },

    async cancel(reservationId: string, reason?: string): Promise<void> {
        await apiCall<void>(`/reservations/${reservationId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    async confirmArrival(reservationId: string): Promise<Reservation> {
        // Get admin token explicitly to ensure we have permission
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // If we have an admin token, use it!
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            // Fallback to user token if no admin token
            const userToken = localStorage.getItem('mesafeliz_token');
            if (userToken) {
                headers['Authorization'] = `Bearer ${userToken}`;
            }
        }

        const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/arrive`, {
            method: 'POST',
            headers
        });

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Failed to confirm arrival');
        }

        return transformReservation(json.data);
    },

    async markNoShow(reservationId: string): Promise<Reservation> {
        return this.updateStatus(reservationId, 'no_show');
    },

    async completeService(reservationId: string): Promise<Reservation> {
        const data = await apiCall<any>(`/reservations/${reservationId}/complete`, {
            method: 'POST',
        });
        return transformReservation(data);
    },
    async verifyQR(qrCode: string, restaurantId: string, autoArrive: boolean = false): Promise<{ reservation: Reservation; autoArrived: boolean }> {
        // Get admin token
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/reservations/verify-qr`, {
            method: 'POST',
            body: JSON.stringify({ qrCode, restaurantId, autoArrive }),
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Failed to verify QR code');
        }
        return {
            reservation: transformReservation(json.data),
            autoArrived: json.autoArrived || false,
        };
    },
};

// ============================================
// OFFER SERVICES
// ============================================

export const offerService = {
    async getAll(): Promise<Offer[]> {
        const response = await fetch(`${API_BASE_URL}/offers`);
        const json = await response.json();

        if (!json.success) {
            return [];
        }

        return (json.data || []).map(transformOffer);
    },

    async getByRestaurant(restaurantId: string): Promise<Offer[]> {
        const response = await fetch(`${API_BASE_URL}/offers/restaurants/${restaurantId}`);
        const json = await response.json();

        if (!json.success) {
            return [];
        }

        return (json.data || []).map(transformOffer);
    },

    async create(restaurantId: string, offer: { title: string; description: string; discount: string; discountType: string; validFrom?: string; validUntil?: string }): Promise<Offer> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const data = await apiCall<any>(`/offers/restaurants/${restaurantId}`, {
            method: 'POST',
            body: JSON.stringify({
                title: offer.title,
                description: offer.description,
                discount: offer.discount,
                discountType: offer.discountType,
                validFrom: offer.validFrom || null,
                validUntil: offer.validUntil || null,
            }),
            headers,
        });
        return transformOffer(data);
    },

    async update(offerId: string, updates: Partial<{ title?: string; description?: string; discount?: string; discountType?: string; validFrom?: string; validUntil?: string; isActive?: boolean }>): Promise<Offer> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const data = await apiCall<any>(`/offers/${offerId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                ...updates,
                is_active: updates.isActive,
            }),
            headers,
        });
        return transformOffer(data);
    },

    async delete(offerId: string): Promise<void> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        await apiCall<void>(`/offers/${offerId}`, {
            method: 'DELETE',
            headers,
        });
    },

    async toggleActive(offerId: string, isActive: boolean): Promise<Offer> {
        return this.update(offerId, { isActive });
    },
};

// ============================================
// TIME SLOT SERVICES
// ============================================

export const timeSlotService = {
    async getAvailable(restaurantId: string, date: string): Promise<TimeSlot[]> {
        try {
            // First try to get from API
            const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/timeslots?date=${date}`);
            const json = await response.json();

            if (json.success && json.data) {
                return json.data;
            }

            // Fallback: Get restaurant settings and generate time slots with correct deposit info
            const restaurant = await restaurantService.getById(restaurantId);
            const settings = (restaurant as any)?.settings || {};


            return generateTimeSlots(
                settings.depositAmount || 200,
                settings.depositRequired || false,
                settings.depositHours || ['19:00', '19:30', '20:00', '20:30', '21:00']
            );
        } catch (error) {
            console.error('Error fetching time slots:', error);
            return generateTimeSlots(200, false, ['19:00', '19:30', '20:00', '20:30', '21:00']);
        }
    },
};

function generateTimeSlots(depositAmount: number, depositRequired: boolean, depositHours: string[]): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (let hour = 12; hour <= 22; hour++) {
        const time = `${hour}:00`;

        // Check if this hour is in depositHours - deposit is required if time is listed
        // Changed: now we check depositHours directly, not the depositRequired flag
        const isDepositHour = depositHours.length > 0 && depositHours.some(dh =>
            dh.startsWith(`${hour}:`) || dh === time
        );

        // Deposit is required if: there are deposit hours AND this is one of them
        const requiresDeposit = isDepositHour;

        slots.push({
            time,
            available: true,
            isPeak: hour >= 19 && hour <= 21,
            requiresDeposit,
            depositAmount: requiresDeposit ? depositAmount : undefined,
        });
    }
    return slots;
}

// ============================================
// MENU SERVICES
// ============================================

export const menuService = {
    async getByRestaurant(restaurantId: string): Promise<MenuItem[]> {
        // Use PUBLIC endpoint - doesn't require authentication
        const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/menu`);
        const json = await response.json();

        if (!json.success) {
            console.error('Error fetching menu:', json.error);
            return [];
        }

        return (json.data || []).map(transformMenuItem);
    },

    async create(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/menu`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category,
                image_url: item.image,
                is_highlighted: item.isHighlighted,
                is_vegetarian: false,
                is_vegan: false
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Failed to create menu item');
        }
        return transformMenuItem(json.data);
    },

    async update(itemId: string, updates: Partial<MenuItem>): Promise<MenuItem> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({
                name: updates.name,
                description: updates.description,
                price: updates.price,
                category: updates.category,
                image_url: updates.image,
                is_highlighted: updates.isHighlighted,
                is_available: updates.isAvailable
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Failed to update menu item');
        }
        return transformMenuItem(json.data);
    },

    async delete(itemId: string): Promise<void> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }
    },
};

// ============================================
// REVIEW SERVICES
// ============================================

export const reviewService = {
    async getByRestaurant(_restaurantId: string): Promise<Review[]> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        // For admin, use the admin endpoint
        if (token) {
            const response = await fetch(`${API_BASE_URL}/admin/opiniones`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const json = await response.json();

            if (!json.success) {
                return [];
            }

            return (json.data || []).map((data: any) => ({
                id: data.id,
                restaurantId: data.restaurant_id,
                userId: data.user_id,
                rating: data.rating,
                foodRating: data.food_rating,
                serviceRating: data.service_rating,
                ambianceRating: data.ambiance_rating,
                valueRating: data.value_rating,
                comment: data.comment,
                photos: data.photos,
                tags: data.tags,
                response: data.response,
                respondedAt: data.responded_at,
                createdAt: data.created_at,
                userName: data.customerName || data.user?.name || data.users?.name || 'Cliente',
                userAvatar: data.customerAvatar || data.user?.avatar_url || data.users?.avatar_url,
                // Keep customerName for backwards compatibility
                customerName: data.customerName || data.user?.name || data.users?.name || 'Cliente',
                customerAvatar: data.customerAvatar || data.user?.avatar_url || data.users?.avatar_url,
            }));
        }

        // For public (non-admin)
        const response = await fetch(`${API_BASE_URL}/restaurants/${_restaurantId}/reviews`);
        const json = await response.json();

        if (!json.success) {
            return [];
        }

        return (json.data || []).map((data: any) => ({
            id: data.id,
            restaurantId: data.restaurant_id,
            userId: data.user_id,
            rating: data.rating,
            foodRating: data.food_rating,
            serviceRating: data.service_rating,
            ambianceRating: data.ambiance_rating,
            valueRating: data.value_rating,
            comment: data.comment,
            photos: data.photos,
            tags: data.tags,
            response: data.response,
            respondedAt: data.responded_at,
            createdAt: data.created_at,
            userName: data.customerName || data.user?.name || data.users?.name || 'Cliente',
            userAvatar: data.customerAvatar || data.user?.avatar_url || data.users?.avatar_url,
            // Consistency
            customerName: data.customerName || data.user?.name || data.users?.name || 'Cliente',
            user: data.user || data.users ? {
                id: (data.user || data.users).id,
                name: (data.user || data.users).name,
                email: '',
                role: 'customer' as const,
                avatar: (data.user || data.users).avatar_url,
                reservationsCount: 0,
                favoriteRestaurants: [],
                createdAt: '',
            } : undefined,
        }));
    },

    async create(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
        const data = await apiCall<any>('/reviews', {
            method: 'POST',
            body: JSON.stringify(review),
        });
        return {
            ...data,
            createdAt: data.created_at,
        };
    },

    async respond(reviewId: string, responseText: string): Promise<Review> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/opiniones/${reviewId}/respuesta`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ response: responseText }),
        });
        const json = await response.json();
        return json.data;
    },
};

// ============================================
// WAITLIST SERVICES
// ============================================

export const waitlistService = {
    async getByRestaurant(_restaurantId: string): Promise<WaitlistEntry[]> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/waitlist`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
        const json = await response.json();

        if (!json.success) {
            return [];
        }

        return (json.data || []).map((data: any) => ({
            id: data.id,
            restaurantId: data.restaurant_id,
            name: data.name,
            phone: data.phone,
            partySize: data.party_size,
            status: data.status,
            estimatedWait: data.estimated_wait,
            priority: data.priority,
            notes: data.notes,
            notifiedAt: data.notified_at,
            seatedAt: data.seated_at,
            createdAt: data.created_at,
        }));
    },

    async add(entry: Omit<WaitlistEntry, 'id' | 'createdAt'>): Promise<WaitlistEntry> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/waitlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({
                name: entry.name,
                phone: entry.phone,
                party_size: entry.partySize,
                notes: entry.notes
            }),
        });
        const json = await response.json();
        return {
            ...json.data,
            createdAt: json.data.created_at,
        };
    },

    async updateStatus(entryId: string, status: WaitlistEntry['status'], tableId?: string): Promise<WaitlistEntry> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/waitlist/${entryId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ status, table_id: tableId }),
        });
        const json = await response.json();
        return json.data;
    },

    async remove(entryId: string): Promise<void> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        await fetch(`${API_BASE_URL}/admin/waitlist/${entryId}`, {
            method: 'DELETE',
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
    },

    async notify(entryId: string): Promise<WaitlistEntry> {
        return this.updateStatus(entryId, 'notified');
    },

    async seat(entryId: string, tableId?: string): Promise<WaitlistEntry> {
        return this.updateStatus(entryId, 'seated', tableId);
    },
};

// ============================================
// DASHBOARD SERVICES
// ============================================

export const dashboardService = {
    async getMetrics(_restaurantId: string, date?: string): Promise<DashboardMetrics> {
        try {
            const session = localStorage.getItem('mesafeliz_restaurant_session');
            const token = session ? JSON.parse(session).token : null;

            const url = new URL(`${API_BASE_URL}/admin/dashboard`);
            if (date) url.searchParams.append('date', date);

            const response = await fetch(url.toString(), {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });
            const json = await response.json();

            if (!json.success) {
                return getDefaultMetrics();
            }

            // Transform backend response to frontend format
            return {
                reservationsToday: json.data.reservas_hoy || 0,
                reservationsChange: 0,
                currentOccupancy: json.data.ocupacion_actual || 0,
                expectedRevenue: json.data.ingresos_anticipos || 0,
                revenueChange: 0,
                pendingConfirmations: json.data.reservas_pendientes || 0,
                noShowRate: 0,
                averageRating: json.data.calificacion_promedio || 0,
                todayStats: json.data.stats_today || {
                    confirmed: 0,
                    pending: 0,
                    cancelled: 0,
                    no_show: 0
                }
            };
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
            return getDefaultMetrics();
        }
    },

    async getAISuggestions(_restaurantId: string): Promise<AISuggestion[]> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/ai-suggestions`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
        const json = await response.json();

        if (!json.success) {
            return [];
        }

        return json.data;
    },

    async getReports(period: 'week' | 'month' | 'quarter' = 'month'): Promise<any[]> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/reportes?period=${period}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
        const json = await response.json();

        if (!json.success) {
            return [];
        }

        return json.data;
    },
};

function getDefaultMetrics(): DashboardMetrics {
    return {
        reservationsToday: 0,
        reservationsChange: 0,
        currentOccupancy: 0,
        expectedRevenue: 0,
        revenueChange: 0,
        pendingConfirmations: 0,
        noShowRate: 0,
        averageRating: 0,
    };
}

// ============================================
// SETTINGS SERVICES
// ============================================

export const settingsService = {
    async getConfiguration(): Promise<any> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/settings`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
        const json = await response.json();

        if (!json.success) {
            throw new Error(json.error || 'Failed to fetch configuration');
        }

        return json.data;
    },

    async saveConfiguration(config: any): Promise<any> {
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        const response = await fetch(`${API_BASE_URL}/admin/settings`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(config),
        });
        const json = await response.json();

        if (!json.success) {
            throw new Error(json.error || 'Failed to save configuration');
        }

        return json.data;
    },
};

// ============================================
// AUTH SERVICES
// ============================================

export const authService = {
    async registerRestaurant(data: any) {
        const response = await fetch(`${API_BASE_URL}/auth/restaurant/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return result.data;
    },

    async loginCustomer(email: string, password: string): Promise<{ user: User; token: string } | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/customer/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data: ApiResponse<{ user: User; token: string }> = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Login error:', error);
            return null;
        }
    },

    async loginRestaurant(email: string, password: string): Promise<{ user: User; restaurant: Restaurant; token: string } | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/restaurant/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data: ApiResponse<{ user: User; restaurant: any; token: string }> = await response.json();

            if (data.success && data.data) {
                return {
                    user: data.data.user,
                    restaurant: transformRestaurant(data.data.restaurant),
                    token: data.data.token
                };
            }
            return null;
        } catch (error) {
            console.error('Restaurant login error:', error);
            return null;
        }
    },

    async register(userData: { email: string; password: string; name: string; phone?: string }): Promise<User | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/customer/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            const data: ApiResponse<User> = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Register error:', error);
            return null;
        }
    },

    async logout(): Promise<void> {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    async getCurrentUser(): Promise<User | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`);
            const data: ApiResponse<User> = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    },
};

// ============================================
// FAVORITE SERVICES
// ============================================

export const favoriteService = {
    async add(restaurantId: string): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            const token = localStorage.getItem('mesafeliz_token');
            const response = await fetch(`${API_BASE_URL}/favorites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({ restaurantId }),
            });
            const data = await response.json();
            return { success: data.success, message: data.message, error: data.error };
        } catch (error: any) {
            console.error('Add favorite error:', error);
            return { success: false, error: error.message };
        }
    },

    async remove(restaurantId: string): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            const token = localStorage.getItem('mesafeliz_token');
            const response = await fetch(`${API_BASE_URL}/favorites/${restaurantId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
            });
            const data = await response.json();
            return { success: data.success, message: data.message, error: data.error };
        } catch (error: any) {
            console.error('Remove favorite error:', error);
            return { success: false, error: error.message };
        }
    },

    async check(restaurantId: string): Promise<boolean> {
        try {
            const token = localStorage.getItem('mesafeliz_token');
            if (!token) return false;

            const response = await fetch(`${API_BASE_URL}/favorites/check/${restaurantId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            const data = await response.json();
            return data.success && data.data?.isFavorite === true;
        } catch (error) {
            console.error('Check favorite error:', error);
            return false;
        }
    },

    async getMyFavorites(): Promise<any[]> {
        try {
            const token = localStorage.getItem('mesafeliz_token');
            if (!token) {
                return [];
            }

            const response = await fetch(`${API_BASE_URL}/favorites/my`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Get favorites error:', error);
            return [];
        }
    },
};

// ============================================
// NOTIFICATION SERVICES
// ============================================

export const notificationService = {
    async getAll(limit = 20): Promise<any[]> {
        const data = await apiCall<any>(`/notifications?limit=${limit}`);
        return data || [];
    },

    async getUnread(): Promise<{ unreadCount: number; data: any[] }> {
        const data = await apiCall<any>('/notifications/unread');
        return data || { unreadCount: 0, data: [] };
    },

    async markAsRead(id: string): Promise<void> {
        await apiCall<void>(`/notifications/${id}/read`, {
            method: 'PATCH',
        });
    },

    async markAllAsRead(): Promise<void> {
        await apiCall<void>('/notifications/read-all', {
            method: 'PATCH',
        });
    },
};

// ============================================
// UPLOAD SERVICES
// ============================================

export const uploadService = {
    async uploadAvatar(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            const token = localStorage.getItem('mesafeliz_token');
            if (!token) {
                return { success: false, error: 'No hay sesión activa' };
            }

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${API_BASE_URL}/upload/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, url: data.data.url };
            } else {
                return { success: false, error: data.error || 'Error al subir imagen' };
            }
        } catch (error: any) {
            console.error('Upload avatar error:', error);
            return { success: false, error: error.message || 'Error al subir imagen' };
        }
    },
};
