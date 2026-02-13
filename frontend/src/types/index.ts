// Restaurant Types
export interface Restaurant {
    id: string;
    name: string;
    description: string;
    image: string;
    rating: number;
    reviewCount: number;
    cuisine: string;
    zone: string;
    priceRange: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    address: string;
    phone?: string;
    email?: string;
    hasOffers?: boolean;
    offerText?: string;
    maxGuestCount?: number;
    hasDeposit?: boolean;
    depositAmount?: number;
    settings?: RestaurantSettings;
    ownerId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface RestaurantSettings {
    maxReservationDays: number;
    minAdvanceHours: number;
    maxPartySize: number;
    autoConfirm: boolean;
    depositRequired: boolean;
    depositAmount: number;
    noShowPenalty: number;
    reminderHours: number[];
}

// Table Types
export type TableStatus = 'disponible' | 'ocupada' | 'reservada' | 'pendiente' | 'deshabilitada';
export type TableShape = 'round' | 'square' | 'rectangle';

export type TableZone = 'main' | 'terrace' | 'vip';

export interface Table {
    id: string;
    restaurantId: string;
    number: number;
    capacity: number;
    status: TableStatus;
    zone: TableZone;
    x: number;
    y: number;
    shape: TableShape;
    width: number;
    height: number;
    currentReservationId?: string;
    occupiedSince?: string;
}

// Legacy alias for backwards compatibility
export type Mesa = Table;

// Reservation Types
export type ReservationStatus =
    | 'pending'
    | 'confirmed'
    | 'arrived'
    | 'completed'
    | 'cancelled'
    | 'no_show';

export interface Reservation {
    id: string;
    restaurantId: string;
    userId: string;
    tableId: string;
    date: string;
    time: string;
    guestCount: number;
    status: ReservationStatus;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    occasion?: string;
    specialRequest?: string;
    depositAmount?: number;
    depositPaid: boolean;
    qrCode: string;
    createdAt: string;
    updatedAt?: string;
    hasReview?: boolean;
    // Populated fields
    restaurant?: Restaurant;
    user?: User;
    table?: Table;
}

// Time Slot Types
export interface TimeSlot {
    time: string;
    available: boolean;
    isPeak: boolean;
    requiresDeposit: boolean;
    depositAmount?: number;
}

// Menu Types
export interface MenuItem {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image?: string;
    isHighlighted: boolean;
    isAvailable: boolean;
    createdAt?: string;
}

export interface MenuCategory {
    id: string;
    name: string;
    order: number;
}

// Offer Types
export type DiscountType = 'percentage' | 'fixed' | 'bogo' | 'special';

export interface Offer {
    id: string;
    restaurantId: string;
    title: string;
    description: string;
    discount: string;
    discountType?: DiscountType;
    discountValue?: number;
    validFrom?: string;
    validUntil: string;
    isActive: boolean;
    usageCount: number;
    maxUsage?: number;
    conditions?: string;
    createdAt?: string;
}

// User Types
export type UserRole = 'customer' | 'restaurant_admin' | 'restaurant_staff' | 'super_admin';

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    role: UserRole;
    reservationsCount: number;
    favoriteRestaurants: string[];
    preferences?: UserPreferences;
    createdAt: string;
    updatedAt?: string;
}

export interface UserPreferences {
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
        marketing?: boolean;
    };
    dietary?: string[];
    preferredZones?: string[];
    preferredCuisines?: string[];
}

// Review Types
export interface Review {
    id: string;
    restaurantId: string;
    userId: string;
    reservationId?: string;
    rating: number;
    foodRating?: number;
    serviceRating?: number;
    ambianceRating?: number;
    valueRating?: number;
    comment?: string;
    photos?: string[];
    tags?: string[];
    response?: string;
    respondedAt?: string;
    createdAt: string;
    // Populated fields
    user?: User;
    customerName?: string;
    customerAvatar?: string;
}

// Waitlist Types
export type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'left' | 'cancelled';

export interface WaitlistEntry {
    id: string;
    restaurantId: string;
    name: string;
    phone: string;
    partySize: number;
    status: WaitlistStatus;
    estimatedWait: number;
    priority: 'normal' | 'vip';
    notes?: string;
    notifiedAt?: string;
    seatedAt?: string;
    createdAt: string;
}

// Notification Types
export type NotificationType =
    | 'reservation_new'
    | 'reservation_confirmed'
    | 'reservation_cancelled'
    | 'reservation_reminder'
    | 'arrival_registered'
    | 'no_show'
    | 'review_new'
    | 'offer_expiring'
    | 'waitlist_ready';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    read: boolean;
    createdAt: string;
}

// Report Types
export interface DashboardMetrics {
    reservationsToday: number;
    reservationsChange: number;
    currentOccupancy: number;
    expectedRevenue: number;
    revenueChange: number;
    pendingConfirmations: number;
    noShowRate: number;
    averageRating: number;
    todayStats?: {
        confirmed: number;
        pending: number;
        cancelled: number;
        no_show: number;
    };
}

export interface OccupancyData {
    hour: string;
    occupancy: number;
}

export interface ReportPeriod {
    startDate: string;
    endDate: string;
}

// AI Suggestion Types
export type SuggestionPriority = 'alta' | 'media' | 'baja';
export type SuggestionCategory = 'ocupacion' | 'ofertas' | 'servicio' | 'menu' | 'marketing';

export interface AISuggestion {
    id: string;
    title: string;
    description: string;
    category: SuggestionCategory;
    priority: SuggestionPriority;
    confidence: number;
    estimatedImpact: string;
    actionLabel: string;
    isApplied: boolean;
    createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Filter Types
export interface RestaurantFilters {
    search?: string;
    zone?: string;
    cuisine?: string;
    priceRange?: string;
    isOpen?: boolean;
    hasOffers?: boolean;
    minRating?: number;
}

export interface ReservationFilters {
    status?: ReservationStatus | 'all';
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}
