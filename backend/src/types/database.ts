/**
 * Database Types for Supabase
 * 
 * These types are generated based on the database schema.
 * In production, you would use `supabase gen types typescript` to generate these.
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    name: string;
                    phone: string | null;
                    avatar_url: string | null;
                    role: 'customer' | 'restaurant_admin' | 'restaurant_staff' | 'super_admin';
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    email: string;
                    name: string;
                    phone?: string | null;
                    avatar_url?: string | null;
                    role?: 'customer' | 'restaurant_admin' | 'restaurant_staff' | 'super_admin';
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string;
                    phone?: string | null;
                    avatar_url?: string | null;
                    role?: 'customer' | 'restaurant_admin' | 'restaurant_staff' | 'super_admin';
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
            restaurants: {
                Row: {
                    id: string;
                    owner_id: string;
                    name: string;
                    description: string | null;
                    address: string | null;
                    phone: string | null;
                    email: string | null;
                    cuisine_type: string | null;
                    zone: string | null;
                    price_range: '$' | '$$' | '$$$' | '$$$$';
                    image_url: string | null;
                    is_active: boolean;
                    open_time: string;
                    close_time: string;
                    settings: Json | null;
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    owner_id: string;
                    name: string;
                    description?: string | null;
                    address?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    cuisine_type?: string | null;
                    zone?: string | null;
                    price_range?: '$' | '$$' | '$$$' | '$$$$';
                    image_url?: string | null;
                    is_active?: boolean;
                    open_time?: string;
                    close_time?: string;
                    settings?: Json | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    owner_id?: string;
                    name?: string;
                    description?: string | null;
                    address?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    cuisine_type?: string | null;
                    zone?: string | null;
                    price_range?: '$' | '$$' | '$$$' | '$$$$';
                    image_url?: string | null;
                    is_active?: boolean;
                    open_time?: string;
                    close_time?: string;
                    settings?: Json | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
            tables: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    number: number;
                    capacity: number;
                    status: 'available' | 'occupied' | 'reserved' | 'pending' | 'disabled';
                    position_x: number;
                    position_y: number;
                    shape: 'round' | 'square' | 'rectangle';
                    width: number;
                    height: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    number: number;
                    capacity: number;
                    status?: 'available' | 'occupied' | 'reserved' | 'pending' | 'disabled';
                    position_x?: number;
                    position_y?: number;
                    shape?: 'round' | 'square' | 'rectangle';
                    width?: number;
                    height?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    number?: number;
                    capacity?: number;
                    status?: 'available' | 'occupied' | 'reserved' | 'pending' | 'disabled';
                    position_x?: number;
                    position_y?: number;
                    shape?: 'round' | 'square' | 'rectangle';
                    width?: number;
                    height?: number;
                    created_at?: string;
                };
            };
            reservations: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    user_id: string;
                    table_id: string;
                    date: string;
                    time: string;
                    guest_count: number;
                    status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled' | 'no_show';
                    occasion: string | null;
                    special_request: string | null;
                    deposit_amount: number | null;
                    deposit_paid: boolean;
                    qr_code: string;
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    user_id: string;
                    table_id: string;
                    date: string;
                    time: string;
                    guest_count: number;
                    status?: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled' | 'no_show';
                    occasion?: string | null;
                    special_request?: string | null;
                    deposit_amount?: number | null;
                    deposit_paid?: boolean;
                    qr_code?: string;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    user_id?: string;
                    table_id?: string;
                    date?: string;
                    time?: string;
                    guest_count?: number;
                    status?: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled' | 'no_show';
                    occasion?: string | null;
                    special_request?: string | null;
                    deposit_amount?: number | null;
                    deposit_paid?: boolean;
                    qr_code?: string;
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
            offers: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    title: string;
                    description: string | null;
                    discount_type: 'percentage' | 'fixed' | 'bogo' | 'special';
                    discount_value: string;
                    valid_from: string | null;
                    valid_until: string;
                    is_active: boolean;
                    usage_count: number;
                    max_usage: number | null;
                    conditions: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    title: string;
                    description?: string | null;
                    discount_type?: 'percentage' | 'fixed' | 'bogo' | 'special';
                    discount_value: string;
                    valid_from?: string | null;
                    valid_until: string;
                    is_active?: boolean;
                    usage_count?: number;
                    max_usage?: number | null;
                    conditions?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    title?: string;
                    description?: string | null;
                    discount_type?: 'percentage' | 'fixed' | 'bogo' | 'special';
                    discount_value?: string;
                    valid_from?: string | null;
                    valid_until?: string;
                    is_active?: boolean;
                    usage_count?: number;
                    max_usage?: number | null;
                    conditions?: string | null;
                    created_at?: string;
                };
            };
            reviews: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    user_id: string;
                    reservation_id: string | null;
                    rating: number;
                    food_rating: number | null;
                    service_rating: number | null;
                    ambiance_rating: number | null;
                    value_rating: number | null;
                    comment: string | null;
                    photos: string[] | null;
                    tags: string[] | null;
                    response: string | null;
                    responded_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    user_id: string;
                    reservation_id?: string | null;
                    rating: number;
                    food_rating?: number | null;
                    service_rating?: number | null;
                    ambiance_rating?: number | null;
                    value_rating?: number | null;
                    comment?: string | null;
                    photos?: string[] | null;
                    tags?: string[] | null;
                    response?: string | null;
                    responded_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    user_id?: string;
                    reservation_id?: string | null;
                    rating?: number;
                    food_rating?: number | null;
                    service_rating?: number | null;
                    ambiance_rating?: number | null;
                    value_rating?: number | null;
                    comment?: string | null;
                    photos?: string[] | null;
                    tags?: string[] | null;
                    response?: string | null;
                    responded_at?: string | null;
                    created_at?: string;
                };
            };
            waitlist: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    name: string;
                    phone: string;
                    party_size: number;
                    status: 'waiting' | 'notified' | 'seated' | 'left' | 'cancelled';
                    estimated_wait: number;
                    priority: 'normal' | 'vip';
                    notes: string | null;
                    notified_at: string | null;
                    seated_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    name: string;
                    phone: string;
                    party_size: number;
                    status?: 'waiting' | 'notified' | 'seated' | 'left' | 'cancelled';
                    estimated_wait?: number;
                    priority?: 'normal' | 'vip';
                    notes?: string | null;
                    notified_at?: string | null;
                    seated_at?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    name?: string;
                    phone?: string;
                    party_size?: number;
                    status?: 'waiting' | 'notified' | 'seated' | 'left' | 'cancelled';
                    estimated_wait?: number;
                    priority?: 'normal' | 'vip';
                    notes?: string | null;
                    notified_at?: string | null;
                    seated_at?: string | null;
                    created_at?: string;
                };
            };
            menu_items: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    name: string;
                    description: string | null;
                    price: number;
                    category: string;
                    image_url: string | null;
                    is_highlighted: boolean;
                    is_available: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    name: string;
                    description?: string | null;
                    price: number;
                    category: string;
                    image_url?: string | null;
                    is_highlighted?: boolean;
                    is_available?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    name?: string;
                    description?: string | null;
                    price?: number;
                    category?: string;
                    image_url?: string | null;
                    is_highlighted?: boolean;
                    is_available?: boolean;
                    created_at?: string;
                };
            };
        };
        Views: {};
        Functions: {};
        Enums: {};
    };
}

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Commonly used types
export type User = Tables<'users'>;
export type Restaurant = Tables<'restaurants'>;
export type Table = Tables<'tables'>;
export type Reservation = Tables<'reservations'>;
export type Offer = Tables<'offers'>;
export type Review = Tables<'reviews'>;
export type WaitlistEntry = Tables<'waitlist'>;
export type MenuItem = Tables<'menu_items'>;
