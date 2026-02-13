import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '@/services/api';

interface StaffUser {
    id: string;
    name: string;
    email: string;
    role: 'staff' | 'restaurant_admin' | 'super_admin';
}

interface StaffRestaurant {
    id: string;
    name: string;
    image_url?: string;
}

interface StaffAuthContextType {
    user: StaffUser | null;
    restaurant: StaffRestaurant | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export const StaffAuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<StaffUser | null>(null);
    const [restaurant, setRestaurant] = useState<StaffRestaurant | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('staff_token');
        const storedUser = localStorage.getItem('staff_user');
        const storedRestaurant = localStorage.getItem('staff_restaurant');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            if (storedRestaurant) {
                setRestaurant(JSON.parse(storedRestaurant));
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/staff/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            const { user: userData, restaurant: restData, token: authToken } = data.data;

            setUser(userData);
            setRestaurant(restData);
            setToken(authToken);

            localStorage.setItem('staff_token', authToken);
            localStorage.setItem('staff_user', JSON.stringify(userData));
            if (restData) {
                localStorage.setItem('staff_restaurant', JSON.stringify(restData));
            }
        } catch (error) {
            console.error('Staff login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setRestaurant(null);
        setToken(null);
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_user');
        localStorage.removeItem('staff_restaurant');
    };

    return (
        <StaffAuthContext.Provider
            value={{
                user,
                restaurant,
                token,
                isAuthenticated: !!user && !!token,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </StaffAuthContext.Provider>
    );
};

export const useStaffAuth = () => {
    const context = useContext(StaffAuthContext);
    if (!context) {
        throw new Error('useStaffAuth must be used within a StaffAuthProvider');
    }
    return context;
};
