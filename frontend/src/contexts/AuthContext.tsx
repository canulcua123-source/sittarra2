import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, API_BASE_URL } from '@/services/api';
import { User } from '@/types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'mesafeliz_user';
const TOKEN_KEY = 'mesafeliz_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(TOKEN_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const result = await authService.loginCustomer(email, password);
            if (result) {
                const { user, token } = result;
                setUser(user);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
                localStorage.setItem(TOKEN_KEY, token);
                return { success: true };
            }
            return { success: false, error: 'Credenciales inválidas' };
        } catch (error: any) {
            console.error('Login error:', error);
            return { success: false, error: error.message || 'Error al iniciar sesión' };
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/customer/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password }),
            });
            const data = await response.json();

            if (data.success) {
                const { user, token } = data.data;
                setUser(user);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
                localStorage.setItem(TOKEN_KEY, token);
                return { success: true };
            }
            return { success: false, error: data.error || 'Error al registrar' };
        } catch (error: any) {
            console.error('Registration error:', error);
            return { success: false, error: error.message || 'Error de conexión' };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
    };

    const updateUser = (updates: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...updates };
            setUser(updatedUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            register,
            logout,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
