-- ============================================
-- SITTARA DATABASE SCHEMA - VERSIÓN FINAL
-- Sistema de Reservas de Restaurantes
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- Usuarios del sistema (clientes, admins, staff)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'restaurant_admin', 'staff', 'super_admin')),
    is_verified BOOLEAN DEFAULT false,
    verification_code VARCHAR(10),
    reset_token VARCHAR(100),
    reset_token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ============================================
-- 1.1 VERIFICATION CODES TABLE
-- Para persistencia de códigos de email (registro, login, etc)
-- ============================================
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_email ON public.verification_codes(email);

-- ============================================
-- 2. RESTAURANTS TABLE
-- Información de restaurantes
-- ============================================
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    address VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    instagram VARCHAR(100),
    facebook VARCHAR(100),
    cuisine_type VARCHAR(100),
    zone VARCHAR(100),
    price_range VARCHAR(10) DEFAULT '$$' CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
    image_url VARCHAR(500),
    photos TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    payment_methods TEXT[] DEFAULT '{"Efectivo", "Tarjeta"}',
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    open_time TIME DEFAULT '12:00',
    close_time TIME DEFAULT '23:00',
    opening_hours JSONB DEFAULT '{
        "monday": {"open": "12:00", "close": "23:00"},
        "tuesday": {"open": "12:00", "close": "23:00"},
        "wednesday": {"open": "12:00", "close": "23:00"},
        "thursday": {"open": "12:00", "close": "23:00"},
        "friday": {"open": "12:00", "close": "00:00"},
        "saturday": {"open": "12:00", "close": "00:00"},
        "sunday": {"open": "12:00", "close": "22:00"}
    }'::jsonb,
    settings JSONB DEFAULT '{
        "maxReservationDays": 30,
        "minAdvanceHours": 2,
        "maxPartySize": 12,
        "autoConfirm": false,
        "depositRequired": false,
        "depositAmount": 200,
        "depositDays": ["friday", "saturday"],
        "depositHours": ["20:00", "21:00"],
        "noShowPenalty": 100,
        "reminderHours": [24, 2],
        "allowWalkIns": true
    }'::jsonb,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    holidays JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ============================================
-- 3. RESTAURANT STAFF TABLE
-- Vincula staff con restaurantes
-- ============================================
CREATE TABLE IF NOT EXISTS public.restaurant_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    staff_role VARCHAR(50) DEFAULT 'waiter' CHECK (staff_role IN ('waiter', 'host', 'manager', 'cashier', 'chef')),
    permissions JSONB DEFAULT '{
        "canViewReservations": true,
        "canCheckIn": true,
        "canChangeTables": true,
        "canViewMenu": true,
        "canEditMenu": false,
        "canViewReports": false,
        "canManageWaitlist": true
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    hired_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, user_id)
);

-- ============================================
-- 4. TABLES (MESAS) TABLE
-- Mesas de los restaurantes
-- ============================================
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    name VARCHAR(50),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    min_capacity INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'blocked', 'disabled')),
    zone VARCHAR(50) DEFAULT 'main',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    shape VARCHAR(20) DEFAULT 'round' CHECK (shape IN ('round', 'square', 'rectangle', 'oval')),
    width INTEGER DEFAULT 60,
    height INTEGER DEFAULT 60,
    rotation INTEGER DEFAULT 0,
    is_outdoor BOOLEAN DEFAULT false,
    is_vip BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, number)
);

-- ============================================
-- 5. RESERVATIONS TABLE
-- Reservaciones de clientes
-- ============================================
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    end_time TIME,
    guest_count INTEGER NOT NULL CHECK (guest_count > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'arrived', 'seated', 'completed', 'cancelled', 'no_show')),
    occasion VARCHAR(100),
    special_request TEXT,
    internal_notes TEXT,
    deposit_amount DECIMAL(10, 2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT false,
    deposit_paid_at TIMESTAMPTZ,
    qr_code VARCHAR(50) UNIQUE NOT NULL,
    confirmation_code VARCHAR(10),
    source VARCHAR(20) DEFAULT 'web' CHECK (source IN ('web', 'app', 'phone', 'walk_in', 'partner')),
    arrived_at TIMESTAMPTZ,
    seated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    has_review BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ============================================
-- 6. OFFERS TABLE
-- Promociones y ofertas
-- ============================================
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'special', 'combo')),
    discount_value VARCHAR(50) NOT NULL,
    promo_code VARCHAR(20),
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    valid_days TEXT[] DEFAULT '{"monday","tuesday","wednesday","thursday","friday","saturday","sunday"}',
    valid_hours_start TIME,
    valid_hours_end TIME,
    min_party_size INTEGER,
    max_party_size INTEGER,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER,
    terms_conditions TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. REVIEWS TABLE
-- Reseñas y calificaciones
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    ambiance_rating INTEGER CHECK (ambiance_rating >= 1 AND ambiance_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    comment TEXT,
    photos TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ============================================
-- 8. WAITLIST TABLE
-- Lista de espera sin reserva
-- ============================================
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'confirmed', 'seated', 'left', 'cancelled', 'no_show')),
    estimated_wait INTEGER DEFAULT 15,
    actual_wait INTEGER,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'vip', 'priority')),
    preferred_zone VARCHAR(50),
    notes TEXT,
    position INTEGER,
    notified_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    seated_at TIMESTAMPTZ,
    table_id UUID REFERENCES public.tables(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. MENU ITEMS TABLE
-- Platillos del menú
-- ============================================
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    original_price DECIMAL(10, 2),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    image_url VARCHAR(500),
    tags TEXT[] DEFAULT '{}',
    allergens TEXT[] DEFAULT '{}',
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_gluten_free BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    spicy_level INTEGER DEFAULT 0 CHECK (spicy_level >= 0 AND spicy_level <= 5),
    calories INTEGER,
    is_highlighted BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ============================================
-- 10. MENU CATEGORIES TABLE
-- Categorías del menú
-- ============================================
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, name)
);

-- ============================================
-- 11. NOTIFICATIONS TABLE
-- Notificaciones del sistema
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('reservation_confirmed', 'reservation_reminder', 'reservation_cancelled', 'review_request', 'offer', 'system')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. FAVORITES TABLE
-- Restaurantes favoritos
-- ============================================
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_zone ON public.restaurants(zone);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON public.restaurants(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON public.restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_featured ON public.restaurants(is_featured);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON public.restaurants(owner_id);

-- Restaurant Staff
CREATE INDEX IF NOT EXISTS idx_staff_restaurant ON public.restaurant_staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON public.restaurant_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON public.restaurant_staff(is_active);

-- Tables
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON public.tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.tables(status);

-- Reservations
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON public.reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON public.reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_qr ON public.reservations(qr_code);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON public.reservations(table_id);

-- Offers
CREATE INDEX IF NOT EXISTS idx_offers_restaurant ON public.offers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_offers_active ON public.offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_valid ON public.offers(valid_until);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON public.reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Waitlist
CREATE INDEX IF NOT EXISTS idx_waitlist_restaurant ON public.waitlist(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);

-- Menu Items
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- Favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant ON public.favorites(restaurant_id);

-- ============================================
-- VIEWS
-- ============================================

-- Vista de restaurantes con estadísticas
CREATE OR REPLACE VIEW public.restaurant_stats AS
SELECT 
    r.id,
    r.name,
    COALESCE(AVG(rev.rating), 0)::DECIMAL(3,2) as avg_rating,
    COUNT(DISTINCT rev.id) as review_count,
    COUNT(DISTINCT CASE WHEN res.status IN ('confirmed', 'completed') THEN res.id END) as total_reservations,
    COUNT(DISTINCT CASE WHEN res.date = CURRENT_DATE AND res.status IN ('pending', 'confirmed', 'arrived') THEN res.id END) as today_reservations
FROM public.restaurants r
LEFT JOIN public.reviews rev ON r.id = rev.restaurant_id
LEFT JOIN public.reservations res ON r.id = res.restaurant_id
GROUP BY r.id, r.name;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código QR único
CREATE OR REPLACE FUNCTION public.generate_qr_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
BEGIN
    code := 'RES-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de confirmación
CREATE OR REPLACE FUNCTION public.generate_confirmation_code()
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Función para calcular rating promedio
CREATE OR REPLACE FUNCTION public.calculate_restaurant_rating(p_restaurant_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    avg_rating DECIMAL;
BEGIN
    SELECT COALESCE(AVG(rating), 0) INTO avg_rating
    FROM public.reviews
    WHERE restaurant_id = p_restaurant_id;
    
    RETURN ROUND(avg_rating, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para restaurantes (lectura pública)
CREATE POLICY "Anyone can view active restaurants" ON public.restaurants
    FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage their restaurants" ON public.restaurants
    FOR ALL USING (auth.uid() = owner_id);

-- Políticas para mesas (lectura pública)
CREATE POLICY "Anyone can view tables" ON public.tables
    FOR SELECT USING (true);

CREATE POLICY "Restaurant owners can manage tables" ON public.tables
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE id = tables.restaurant_id AND owner_id = auth.uid()
        )
    );

-- Políticas para reservaciones
CREATE POLICY "Users can view their own reservations" ON public.reservations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reservations" ON public.reservations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations" ON public.reservations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Restaurant owners can view their reservations" ON public.reservations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE id = reservations.restaurant_id AND owner_id = auth.uid()
        )
    );

-- Políticas para ofertas (lectura pública)
CREATE POLICY "Anyone can view active offers" ON public.offers
    FOR SELECT USING (is_active = true AND valid_until >= CURRENT_DATE);

CREATE POLICY "Restaurant owners can manage offers" ON public.offers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE id = offers.restaurant_id AND owner_id = auth.uid()
        )
    );

-- Políticas para reseñas (lectura pública)
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para lista de espera
CREATE POLICY "Restaurant owners can manage waitlist" ON public.waitlist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE id = waitlist.restaurant_id AND owner_id = auth.uid()
        )
    );

-- Políticas para menú (lectura pública)
CREATE POLICY "Anyone can view available menu items" ON public.menu_items
    FOR SELECT USING (is_available = true);

CREATE POLICY "Restaurant owners can manage menu" ON public.menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.restaurants 
            WHERE id = menu_items.restaurant_id AND owner_id = auth.uid()
        )
    );

-- Políticas para notificaciones
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para favoritos
CREATE POLICY "Users can manage their favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- SEED DATA DE EJEMPLO (OPCIONAL)
-- ============================================

-- Descomentar para insertar datos de prueba
/*
INSERT INTO public.users (id, email, name, phone, role, password_hash) VALUES
    (uuid_generate_v4(), 'admin@sittara.com', 'Admin Sittara', '9991234567', 'super_admin', '$2a$10$example_hash'),
    (uuid_generate_v4(), 'restaurante@example.com', 'Juan Restaurantero', '9999876543', 'restaurant_admin', '$2a$10$example_hash'),
    (uuid_generate_v4(), 'cliente@example.com', 'María Cliente', '9995551234', 'customer', '$2a$10$example_hash');
*/

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Sittara database schema v2.0 created successfully!';
    RAISE NOTICE '📊 Tables: users, restaurants, restaurant_staff, tables, reservations, offers, reviews, waitlist, menu_items, menu_categories, notifications, favorites';
END $$;
-- ============================================
-- 12. AUDIT LOGS TABLE
-- Seguimiento de acciones administrativas y cambios sensibles
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);
