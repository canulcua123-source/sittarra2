import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MapPin, LogOut, RefreshCw, Calendar, Users,
    Loader2, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { toast } from '@/components/ui/use-toast';

interface Table {
    id: string;
    number: number;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'disabled';
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const StaffTablesPage = () => {
    const navigate = useNavigate();
    const { user, restaurant, token, isAuthenticated, logout } = useStaffAuth();

    const [tables, setTables] = useState<Table[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/staff/login');
        }
    }, [isAuthenticated, navigate]);

    // Fetch tables
    const fetchTables = async () => {
        if (!restaurant?.id || !token) return;

        setIsLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/staff/tables?restaurantId=${restaurant.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                setTables(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching tables:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar las mesas',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (restaurant?.id) {
            fetchTables();
            // Auto-refresh every 15 seconds
            const interval = setInterval(fetchTables, 15000);
            return () => clearInterval(interval);
        }
    }, [restaurant?.id, token]);

    // Toggle table status
    const toggleTableStatus = async (table: Table) => {
        const newStatus = table.status === 'available' ? 'occupied' : 'available';
        setProcessingId(table.id);

        try {
            const response = await fetch(
                `${API_BASE_URL}/staff/tables/${table.id}/status`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: newStatus }),
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: newStatus === 'available' ? '🟢 Mesa Liberada' : '🔴 Mesa Ocupada',
                    description: `Mesa ${table.number} actualizada`,
                });
                fetchTables();
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'No se pudo actualizar la mesa',
                variant: 'destructive',
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/staff/login');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-500 hover:bg-green-600';
            case 'occupied': return 'bg-red-500 hover:bg-red-600';
            case 'reserved': return 'bg-yellow-500';
            case 'disabled': return 'bg-gray-400';
            default: return 'bg-gray-300';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'available': return 'Disponible';
            case 'occupied': return 'Ocupada';
            case 'reserved': return 'Reservada';
            case 'disabled': return 'Bloqueada';
            default: return status;
        }
    };

    // Count by status
    const availableCount = tables.filter(t => t.status === 'available').length;
    const occupiedCount = tables.filter(t => t.status === 'occupied').length;
    const reservedCount = tables.filter(t => t.status === 'reserved').length;

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-blue-600 text-white shadow-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold">{restaurant?.name || 'Staff'}</h1>
                            <p className="text-blue-200 text-sm">Mapa de Mesas</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchTables}
                                className="text-white hover:bg-blue-700"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/staff/reservas')}
                                className="text-white hover:bg-blue-700"
                            >
                                <Calendar className="h-4 w-4 mr-1" />
                                Reservas
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-white hover:bg-blue-700"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-100 border border-green-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">{availableCount}</p>
                        <p className="text-sm text-green-600">Disponibles</p>
                    </div>
                    <div className="bg-red-100 border border-red-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-red-700">{occupiedCount}</p>
                        <p className="text-sm text-red-600">Ocupadas</p>
                    </div>
                    <div className="bg-yellow-100 border border-yellow-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-700">{reservedCount}</p>
                        <p className="text-sm text-yellow-600">Reservadas</p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 justify-center mb-6 p-4 bg-white rounded-xl shadow">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-green-500"></div>
                        <span className="text-sm">Disponible (tap para ocupar)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-red-500"></div>
                        <span className="text-sm">Ocupada (tap para liberar)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-yellow-500"></div>
                        <span className="text-sm">Reservada (no editable)</span>
                    </div>
                </div>

                {/* Loading */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : tables.length === 0 ? (
                    <div className="text-center py-12">
                        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No hay mesas configuradas</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {tables.map((table) => (
                            <motion.button
                                key={table.id}
                                whileHover={(table.status === 'available' || table.status === 'occupied') ? { scale: 1.05 } : {}}
                                whileTap={(table.status === 'available' || table.status === 'occupied') ? { scale: 0.95 } : {}}
                                onClick={() => {
                                    if (table.status === 'available' || table.status === 'occupied') {
                                        toggleTableStatus(table);
                                    }
                                }}
                                disabled={
                                    processingId === table.id ||
                                    (table.status !== 'available' && table.status !== 'occupied')
                                }
                                className={`
                  relative p-6 rounded-2xl text-white font-bold transition-all
                  ${getStatusColor(table.status)}
                  ${(table.status === 'reserved' || table.status === 'disabled') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer shadow-lg'}
                `}
                            >
                                {processingId === table.id ? (
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                ) : (
                                    <>
                                        <div className="text-3xl mb-2">{table.number}</div>
                                        <div className="flex items-center justify-center gap-1 text-sm opacity-90">
                                            <Users className="h-4 w-4" />
                                            <span>{table.capacity}</span>
                                        </div>
                                        <div className="text-xs mt-2 opacity-80">
                                            {getStatusLabel(table.status)}
                                        </div>
                                    </>
                                )}

                                {/* Status indicator */}
                                {table.status === 'occupied' && (
                                    <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow">
                                        <X className="h-4 w-4 text-red-500" />
                                    </div>
                                )}
                                {table.status === 'available' && (
                                    <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow">
                                        <Check className="h-4 w-4 text-green-500" />
                                    </div>
                                )}
                            </motion.button>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 text-center text-sm text-gray-500">
                👤 {user?.name} • Última actualización: {new Date().toLocaleTimeString('es-MX')}
            </footer>
        </div>
    );
};

export default StaffTablesPage;
