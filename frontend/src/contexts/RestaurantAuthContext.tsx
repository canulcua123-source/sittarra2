import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Restaurant, User } from '@/types';
import { authService } from '@/services/api';

interface RestaurantAuthContextType {
    user: User | null;
    restaurant: Restaurant | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    updateRestaurant: (updates: Partial<Restaurant>) => void;
}

const RestaurantAuthContext = createContext<RestaurantAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'mesafeliz_restaurant_session';

export const RestaurantAuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const savedSession = localStorage.getItem(STORAGE_KEY);
        if (savedSession) {
            try {
                const { user: savedUser, restaurant: savedRestaurant } = JSON.parse(savedSession);
                setUser(savedUser);
                setRestaurant(savedRestaurant);
            } catch (e) {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const result = await authService.loginRestaurant(email, password);

            if (result) {
                setUser(result.user);
                setRestaurant(result.restaurant);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        setRestaurant(null);
        localStorage.removeItem(STORAGE_KEY);
        authService.logout();
    };

    const updateRestaurant = (updates: Partial<Restaurant>) => {
        if (restaurant) {
            const updatedRestaurant = { ...restaurant, ...updates };
            setRestaurant(updatedRestaurant);

            // Update localStorage
            const savedSession = localStorage.getItem(STORAGE_KEY);
            if (savedSession) {
                const session = JSON.parse(savedSession);
                session.restaurant = updatedRestaurant;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            }
        }
    };

    return (
        <RestaurantAuthContext.Provider value={{
            user,
            restaurant,
            isAuthenticated: !!user && !!restaurant,
            isLoading,
            login,
            logout,
            updateRestaurant
        }}>
            {children}
        </RestaurantAuthContext.Provider>
    );
};

export const useRestaurantAuth = () => {
    const context = useContext(RestaurantAuthContext);
    if (context === undefined) {
        throw new Error('useRestaurantAuth must be used within a RestaurantAuthProvider');
    }
    return context;
};

// Higher-order component for protected routes
export const withRestaurantAuth = <P extends object>(
    WrappedComponent: React.ComponentType<P>
) => {
    return function WithAuthComponent(props: P) {
        const { isAuthenticated, isLoading } = useRestaurantAuth();
        const navigate = useNavigate();

        useEffect(() => {
            if (!isLoading && !isAuthenticated) {
                navigate('/admin/login', { replace: true });
            }
        }, [isAuthenticated, isLoading, navigate]);

        if (isLoading) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            );
        }

        if (!isAuthenticated) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };
};
