/**
 * Custom React Hooks for Mesa Feliz
 * 
 * These hooks provide reusable logic for common operations
 * throughout the application.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    restaurantService,
    tableService,
    reservationService,
    offerService,
    reviewService,
    waitlistService,
    dashboardService,
    menuService,
    timeSlotService,
    notificationService
} from '@/services/api';
import {
    Restaurant,
    Table,
    Reservation,
    Offer,
    Review,
    WaitlistEntry,
    MenuItem,
    TimeSlot,
    DashboardMetrics,
    AISuggestion,
    RestaurantFilters,
    ReservationFilters
} from '@/types';

// ============================================
// RESTAURANT HOOKS
// ============================================

export const useRestaurants = (filters?: RestaurantFilters) => {
    return useQuery({
        queryKey: ['restaurants', filters],
        queryFn: () => restaurantService.getAll(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useRestaurant = (id: string | undefined) => {
    return useQuery({
        queryKey: ['restaurant', id],
        queryFn: () => restaurantService.getById(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
};

export const useFeaturedRestaurants = () => {
    return useQuery({
        queryKey: ['restaurants', 'featured'],
        queryFn: () => restaurantService.getFeatured(),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

export const useUpdateRestaurant = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ restaurantId, updates }: { restaurantId: string; updates: Partial<Restaurant> }) =>
            restaurantService.update(restaurantId, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['restaurant', variables.restaurantId] });
            queryClient.invalidateQueries({ queryKey: ['restaurants'] });
        },
    });
};

// ============================================
// TABLE HOOKS
// ============================================

export const useTables = (restaurantId: string | undefined) => {
    return useQuery({
        queryKey: ['tables', restaurantId],
        queryFn: () => tableService.getByRestaurant(restaurantId!),
        enabled: !!restaurantId,
        staleTime: 30 * 1000, // 30 seconds - tables change frequently
        refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    });
};

export const useAvailableTables = (
    restaurantId: string | undefined,
    date: string | undefined,
    time: string | undefined,
    guestCount: number
) => {
    return useQuery({
        queryKey: ['tables', 'available', restaurantId, date, time, guestCount],
        queryFn: () => tableService.getAvailable(restaurantId!, date!, time!, guestCount),
        enabled: !!restaurantId && !!date && !!time && guestCount > 0,
        staleTime: 60 * 1000, // 1 minute
    });
};

export const useUpdateTableStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tableId, status }: { tableId: string; status: Table['status'] }) =>
            tableService.updateStatus(tableId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

export const useCreateTable = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (table: Partial<Table>) => tableService.create(table),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

export const useUpdateTable = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tableId, updates }: { tableId: string; updates: Partial<Table> }) =>
            tableService.update(tableId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

export const useDeleteTable = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (tableId: string) => tableService.delete(tableId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

// ============================================
// RESERVATION HOOKS
// ============================================

export const useUserReservations = (userId: string | undefined) => {
    return useQuery({
        queryKey: ['reservations', 'user', userId],
        queryFn: () => reservationService.getByUser(userId!),
        enabled: !!userId,
        staleTime: 60 * 1000, // Reduced staleTime to 1 minute
        refetchInterval: 30000, // Refresh every 30 seconds
    });
};

export const useRestaurantReservations = (
    restaurantId: string | undefined,
    filters?: ReservationFilters
) => {
    return useQuery({
        queryKey: ['reservations', 'restaurant', restaurantId, filters],
        queryFn: () => reservationService.getByRestaurant(restaurantId!, filters),
        enabled: !!restaurantId,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // Auto-refresh every minute
    });
};

export const useCreateReservation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reservation: Omit<Reservation, 'id' | 'qrCode' | 'createdAt'>) =>
            reservationService.create(reservation),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] });
        },
    });
};

export const useUpdateReservationStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ reservationId, status }: { reservationId: string; status: Reservation['status'] }) =>
            reservationService.updateStatus(reservationId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

export const useCancelReservation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ reservationId, reason }: { reservationId: string; reason?: string }) =>
            reservationService.cancel(reservationId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

export const useConfirmArrival = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reservationId: string) => reservationService.confirmArrival(reservationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

export const useCompleteService = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reservationId: string) => reservationService.completeService(reservationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        },
    });
};

// ============================================
// OFFER HOOKS
// ============================================

export const useOffers = () => {
    return useQuery({
        queryKey: ['offers'],
        queryFn: () => offerService.getAll(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useRestaurantOffers = (restaurantId: string | undefined) => {
    return useQuery({
        queryKey: ['offers', restaurantId],
        queryFn: () => offerService.getByRestaurant(restaurantId!),
        enabled: !!restaurantId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateOffer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ restaurantId, offer }: { restaurantId: string; offer: { title: string; description: string; discount: string; discountType: string; validFrom?: string; validUntil?: string } }) =>
            offerService.create(restaurantId, offer),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            queryClient.invalidateQueries({ queryKey: ['offers', variables.restaurantId] });
        },
    });
};

export const useUpdateOffer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ offerId, updates }: { offerId: string; updates: Partial<Offer> }) =>
            offerService.update(offerId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers'] });
        },
    });
};

export const useDeleteOffer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (offerId: string) => offerService.delete(offerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers'] });
        },
    });
};

// ============================================
// TIME SLOT HOOKS
// ============================================

export const useTimeSlots = (restaurantId: string | undefined, date: string | undefined) => {
    return useQuery({
        queryKey: ['timeSlots', restaurantId, date],
        queryFn: () => timeSlotService.getAvailable(restaurantId!, date!),
        enabled: !!restaurantId && !!date,
        staleTime: 5 * 60 * 1000,
    });
};

// ============================================
// MENU HOOKS
// ============================================

export const useMenu = (restaurantId: string | undefined) => {
    return useQuery({
        queryKey: ['menu', restaurantId],
        queryFn: () => menuService.getByRestaurant(restaurantId!),
        enabled: !!restaurantId,
        staleTime: 10 * 60 * 1000,
    });
};

export const useCreateMenuItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (item: Omit<MenuItem, 'id'>) => menuService.create(item),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['menu', variables.restaurantId] });
        },
    });
};

export const useUpdateMenuItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<MenuItem> }) =>
            menuService.update(itemId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menu'] });
        },
    });
};

export const useDeleteMenuItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (itemId: string) => menuService.delete(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['menu'] });
        },
    });
};

// ============================================
// REVIEW HOOKS
// ============================================

export const useReviews = (restaurantId: string | undefined) => {
    return useQuery({
        queryKey: ['reviews', restaurantId],
        queryFn: () => reviewService.getByRestaurant(restaurantId!),
        enabled: !!restaurantId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateReview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (review: Omit<Review, 'id' | 'createdAt'>) => reviewService.create(review),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['reviews', variables.restaurantId] });
            queryClient.invalidateQueries({ queryKey: ['restaurant', variables.restaurantId] });
        },
    });
};

export const useRespondToReview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) =>
            reviewService.respond(reviewId, response),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
        },
    });
};

// ============================================
// WAITLIST HOOKS
// ============================================

export const useWaitlist = (restaurantId: string | undefined) => {
    return useQuery({
        queryKey: ['waitlist', restaurantId],
        queryFn: () => waitlistService.getByRestaurant(restaurantId!),
        enabled: !!restaurantId,
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });
};

export const useAddToWaitlist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (entry: Omit<WaitlistEntry, 'id' | 'createdAt'>) => waitlistService.add(entry),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['waitlist', variables.restaurantId] });
        },
    });
};

export const useUpdateWaitlistStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, status, tableId }: { entryId: string; status: WaitlistEntry['status']; tableId?: string }) =>
            waitlistService.updateStatus(entryId, status, tableId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waitlist'] });
        },
    });
};

export const useRemoveFromWaitlist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (entryId: string) => waitlistService.remove(entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waitlist'] });
        },
    });
};

// ============================================
// DASHBOARD HOOKS
// ============================================

export const useDashboardMetrics = (restaurantId: string | undefined, date?: string) => {
    return useQuery({
        queryKey: ['dashboard', 'metrics', restaurantId, date],
        queryFn: () => dashboardService.getMetrics(restaurantId!, date),
        enabled: !!restaurantId,
        staleTime: 60 * 1000, // 1 minute
        refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    });
};

export const useAISuggestions = (restaurantId: string | undefined) => {
    return useQuery({
        queryKey: ['dashboard', 'ai-suggestions', restaurantId],
        queryFn: () => dashboardService.getAISuggestions(restaurantId!),
        enabled: !!restaurantId,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

export const useReports = (period: 'week' | 'month' | 'quarter') => {
    return useQuery({
        queryKey: ['dashboard', 'reports', period],
        queryFn: () => dashboardService.getReports(period),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useNotifications = (limit = 20) => {
    return useQuery({
        queryKey: ['notifications', limit],
        queryFn: () => notificationService.getAll(limit),
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
    });
};

export const useUnreadNotifications = () => {
    return useQuery({
        queryKey: ['notifications', 'unread'],
        queryFn: () => notificationService.getUnread(),
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
        refetchOnWindowFocus: true,
    });
};

export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => notificationService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};


export const useMarkAllNotificationsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => notificationService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook for debounced values
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

/**
 * Hook for local storage state
 */
export const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = useCallback((value: T) => {
        try {
            setStoredValue(value);
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(error);
        }
    }, [key]);

    return [storedValue, setValue];
};

/**
 * Hook for detecting clicks outside an element
 */
export const useOnClickOutside = <T extends HTMLElement>(
    handler: () => void
): React.RefObject<T> => {
    const ref = useRef<T>(null);

    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler();
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [handler]);

    return ref;
};

/**
 * Hook for media queries
 */
export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }

        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);

        return () => media.removeEventListener('change', listener);
    }, [matches, query]);

    return matches;
};

export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
export const useIsTablet = () => useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)');

/**
 * Hook for polling/auto-refresh
 */
export const useInterval = (callback: () => void, delay: number | null) => {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) return;

        const id = setInterval(() => savedCallback.current(), delay);
        return () => clearInterval(id);
    }, [delay]);
};
