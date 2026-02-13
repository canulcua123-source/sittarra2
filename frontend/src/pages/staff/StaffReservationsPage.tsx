import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Calendar, Clock, Users, Phone, Check, LogOut,
    RefreshCw, MapPin, Loader2, User, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { toast } from '@/components/ui/use-toast';

interface Reservation {
    id: string;
    date: string;
    time: string;
    guest_count: number;
    status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled';
    occasion?: string;
    special_request?: string;
    users: {
        id: string;
        name: string;
        phone: string;
        email: string;
    };
    tables: {
        id: string;
        number: number;
        capacity: number;
    };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const StaffReservationsPage = () => {
    const navigate = useNavigate();
    const { user, restaurant, token, isAuthenticated, logout } = useStaffAuth();

    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/staff/login');
        }
    }, [isAuthenticated, navigate]);

    // Fetch today's reservations
    const fetchReservations = async () => {
        if (!restaurant?.id || !token) return;

        setIsLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/staff/reservations/today?restaurantId=${restaurant.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                setReservations(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching reservations:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar las reservas',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (restaurant?.id) {
            fetchReservations();
            // Auto-refresh every 30 seconds
            const interval = setInterval(fetchReservations, 30000);
            return () => clearInterval(interval);
        }
    }, [restaurant?.id, token]);

    // Handle check-in
    const handleCheckIn = async (reservationId: string) => {
        setProcessingId(reservationId);
        try {
            const response = await fetch(
                `${API_BASE_URL}/staff/reservations/${reservationId}/arrive`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: '✅ Cliente registrado',
                    description: 'La mesa ha sido marcada como ocupada',
                });
                fetchReservations();
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'No se pudo registrar la llegada',
                variant: 'destructive',
            });
        } finally {
            setProcessingId(null);
        }
    };

    // Handle complete service
    const handleComplete = async (reservationId: string) => {
        setProcessingId(reservationId);
        try {
            const response = await fetch(
                `${API_BASE_URL}/reservations/${reservationId}/complete`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: '✅ Servicio finalizado',
                    description: 'La mesa ha sido liberada y el cliente ya puede calificar su visita',
                });
                fetchReservations();
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'No se pudo finalizar el servicio',
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

    // Filter reservations by search
    const filteredReservations = reservations.filter(r =>
        r.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.users?.phone?.includes(searchTerm) ||
        r.tables?.number?.toString().includes(searchTerm)
    );

    // Group by status
    const pendingReservations = filteredReservations.filter(r => r.status === 'pending');
    const confirmedReservations = filteredReservations.filter(r => r.status === 'confirmed');
    const arrivedReservations = filteredReservations.filter(r => r.status === 'arrived');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'confirmed': return 'bg-green-500';
            case 'arrived': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'confirmed': return 'Confirmada';
            case 'arrived': return 'En Mesa';
            default: return status;
        }
    };

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
                            <p className="text-blue-200 text-sm">
                                {new Date().toLocaleDateString('es-MX', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchReservations}
                                className="text-white hover:bg-blue-700"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/staff/mesas')}
                                className="text-white hover:bg-blue-700"
                            >
                                <MapPin className="h-4 w-4 mr-1" />
                                Mesas
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
                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Buscar por nombre, teléfono o mesa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-yellow-100 border border-yellow-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-700">{pendingReservations.length}</p>
                        <p className="text-sm text-yellow-600">Pendientes</p>
                    </div>
                    <div className="bg-green-100 border border-green-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">{confirmedReservations.length}</p>
                        <p className="text-sm text-green-600">Confirmadas</p>
                    </div>
                    <div className="bg-blue-100 border border-blue-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-700">{arrivedReservations.length}</p>
                        <p className="text-sm text-blue-600">En Mesa</p>
                    </div>
                </div>

                {/* Loading */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : filteredReservations.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No hay reservas para hoy</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredReservations.map((reservation) => (
                            <motion.div
                                key={reservation.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className={`border-l-4 ${reservation.status === 'arrived'
                                    ? 'border-l-blue-500'
                                    : reservation.status === 'confirmed'
                                        ? 'border-l-green-500'
                                        : 'border-l-yellow-500'
                                    }`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                {/* Time & Table */}
                                                <div className="flex items-center gap-4 mb-2">
                                                    <span className="text-2xl font-bold text-gray-900">
                                                        {reservation.time?.slice(0, 5)}
                                                    </span>
                                                    <Badge className={getStatusColor(reservation.status)}>
                                                        {getStatusLabel(reservation.status)}
                                                    </Badge>
                                                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-medium">
                                                        Mesa {reservation.tables?.number}
                                                    </span>
                                                </div>

                                                {/* Guest Info */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-gray-400" />
                                                        <span className="font-medium">{reservation.users?.name || 'Sin nombre'}</span>
                                                        <span className="text-gray-500">•</span>
                                                        <Users className="h-4 w-4 text-gray-400" />
                                                        <span>{reservation.guest_count} personas</span>
                                                    </div>
                                                    {reservation.users?.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Phone className="h-4 w-4" />
                                                            <a href={`tel:${reservation.users.phone}`} className="hover:underline">
                                                                {reservation.users.phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {reservation.occasion && (
                                                        <p className="text-sm text-blue-600">
                                                            🎉 {reservation.occasion}
                                                        </p>
                                                    )}
                                                    {reservation.special_request && (
                                                        <p className="text-sm text-gray-500 italic">
                                                            "{reservation.special_request}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="ml-4">
                                                {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                                                    <Button
                                                        onClick={() => handleCheckIn(reservation.id)}
                                                        disabled={processingId === reservation.id}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        {processingId === reservation.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Check className="h-4 w-4 mr-1" />
                                                                Check-in
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                                {reservation.status === 'arrived' && (
                                                    <Button
                                                        onClick={() => handleComplete(reservation.id)}
                                                        disabled={processingId === reservation.id}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        {processingId === reservation.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Check className="h-4 w-4 mr-1" />
                                                                Finalizar
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
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

export default StaffReservationsPage;
