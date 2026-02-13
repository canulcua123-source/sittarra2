import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Calendar, Clock, Users, TrendingUp, TrendingDown, AlertCircle,
    DollarSign, Check, X, ChevronRight, Bell,
    MoreHorizontal, Eye, Sparkles, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AdminLayout from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';
import { useDashboardMetrics, useAISuggestions, useRestaurantReservations } from '@/hooks/useData';
import { useRestaurantAuth, withRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const RestaurantDashboard = () => {
    const { restaurant } = useRestaurantAuth();
    const restaurantId = restaurant?.id;

    const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetrics(restaurantId, format(new Date(), 'yyyy-MM-dd'));
    const { data: aiSuggestionsData, isLoading: isTableLoading } = useAISuggestions(restaurantId);
    const { data: upcomingReservations = [], isLoading: isReservationsLoading } = useRestaurantReservations(restaurantId, {
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'all' as any // API side should filter correctly
    });

    const currentTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const currentDate = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    // Sort and limit reservations for "Upcoming"
    const displayReservations = upcomingReservations
        .filter(r => r.status === 'confirmed' || r.status === 'pending')
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 5);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-success text-success-foreground';
            case 'pending': return 'bg-warning text-warning-foreground';
            case 'cancelled': return 'bg-destructive text-destructive-foreground';
            case 'arrived': return 'bg-info text-info-foreground';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    if (isMetricsLoading || isReservationsLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-full min-h-[60vh]">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Cargando dashboard...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    // Default metrics if not available
    const stats = metrics || {
        reservationsToday: 0,
        reservationsChange: 0,
        currentOccupancy: 0,
        expectedRevenue: 0,
        revenueChange: 0,
        pendingConfirmations: 0,
        noShowRate: 0,
        averageRating: 0
    };

    const suggestions = aiSuggestionsData || [
        { id: '1', type: 'efficiency', content: 'Agrega más platillos destacados para aumentar el ticket promedio.', priority: 'medium' },
        { id: '2', type: 'marketing', content: 'Crea una oferta para los martes, suele haber baja ocupación.', priority: 'low' }
    ];

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
                        <p className="text-muted-foreground capitalize">
                            {currentDate} • {currentTime}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2">
                            <Bell className="w-4 h-4" />
                            {stats.pendingConfirmations > 0 && (
                                <Badge className="bg-destructive text-xs">{stats.pendingConfirmations}</Badge>
                            )}
                        </Button>
                        <Button asChild className="gap-2">
                            <Link to="/admin/reservas">
                                <Eye className="w-4 h-4" />
                                Ver Reservas
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl p-6 shadow-card"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-primary" />
                            </div>
                            <Badge variant="outline" className={cn("gap-1", stats.reservationsChange >= 0 ? "text-success" : "text-destructive")}>
                                {stats.reservationsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(stats.reservationsChange)}%
                            </Badge>
                        </div>
                        <p className="text-3xl font-bold">{stats.reservationsToday}</p>
                        <p className="text-sm text-muted-foreground">Reservas hoy</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-card rounded-xl p-6 shadow-card"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-success" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{stats.currentOccupancy}%</p>
                        <p className="text-sm text-muted-foreground">Ocupación actual</p>
                        <Progress value={stats.currentOccupancy} className="mt-2 h-2" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-card rounded-xl p-6 shadow-card"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-secondary" />
                            </div>
                            <Badge variant="outline" className={cn("gap-1", stats.revenueChange >= 0 ? "text-success" : "text-destructive")}>
                                {stats.revenueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(stats.revenueChange)}%
                            </Badge>
                        </div>
                        <p className="text-3xl font-bold">${(stats.expectedRevenue / 1000).toFixed(1)}k</p>
                        <p className="text-sm text-muted-foreground">Ingreso esperado</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-card rounded-xl p-6 shadow-card"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-warning" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{stats.pendingConfirmations}</p>
                        <p className="text-sm text-muted-foreground">Pendientes confirmar</p>
                    </motion.div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Upcoming Reservations */}
                    <div className="lg:col-span-2 bg-card rounded-xl p-6 shadow-card">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-display font-semibold">Próximas Reservas</h2>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/admin/reservas" className="gap-1">
                                    Ver todas <ChevronRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {displayReservations.length === 0 ? (
                                <div className="text-center py-10 bg-muted/20 rounded-lg">
                                    <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground text-sm">No hay reservaciones confirmadas o pendientes para hoy.</p>
                                </div>
                            ) : (
                                displayReservations.map((reservation, index) => (
                                    <motion.div
                                        key={reservation.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center justify-between p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-lg font-bold">{reservation.time.substring(0, 5)}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium">{reservation.customerName}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {reservation.guestCount} personas • {reservation.table?.number ? `Mesa ${reservation.table.number}` : 'Sin mesa'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={cn('capitalize text-xs', getStatusColor(reservation.status))}>
                                                {reservation.status === 'confirmed' ? 'Confirmada' :
                                                    reservation.status === 'pending' ? 'Pendiente' :
                                                        reservation.status === 'arrived' ? 'Llegó' : reservation.status}
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {reservation.status === 'confirmed' && (
                                                        <DropdownMenuItem className="gap-2">
                                                            <Check className="w-4 h-4" />
                                                            Marcar llegada
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem asChild>
                                                        <Link to="/admin/reservas" className="flex items-center gap-2">
                                                            <Eye className="w-4 h-4" />
                                                            Ver detalles
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        {/* Occupancy Summary - Replaced Peak Hours mock with simplified summary */}
                        <div className="bg-card rounded-xl p-6 shadow-card">
                            <h2 className="text-xl font-display font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Resumen de Ocupación</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Tasa de No-show</span>
                                    <span className="font-bold text-destructive">{stats.noShowRate}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Rating Promedio</span>
                                    <span className="font-bold text-warning flex items-center gap-1">
                                        {stats.averageRating} ★
                                    </span>
                                </div>
                                <div className="pt-4 border-t">
                                    <Button variant="outline" size="sm" className="w-full" asChild>
                                        <Link to="/admin/mesas">Ver mapa de mesas</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* AI Suggestions */}
                        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-6 border border-primary/20">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-display font-semibold">Sugerencias IA</h2>
                            </div>
                            <div className="space-y-3">
                                {suggestions.slice(0, 2).map((suggestion, index) => (
                                    <div key={index} className="flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                        <p className="text-sm text-balance">
                                            {typeof suggestion === 'string' ? suggestion : suggestion.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" size="sm" className="mt-4 w-full text-xs" asChild>
                                <Link to="/admin/configuracion">Optimizar restaurante</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-success/10 rounded-xl p-4 text-center border border-success/20">
                        <Check className="w-5 h-5 text-success mx-auto mb-2" />
                        <p className="text-2xl font-bold text-success">
                            {stats.todayStats?.confirmed || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Confirmadas</p>
                    </div>
                    <div className="bg-warning/10 rounded-xl p-4 text-center border border-warning/20">
                        <Clock className="w-5 h-5 text-warning mx-auto mb-2" />
                        <p className="text-2xl font-bold text-warning">
                            {stats.todayStats?.pending || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Pendientes</p>
                    </div>
                    <div className="bg-destructive/10 rounded-xl p-4 text-center border border-destructive/20">
                        <X className="w-5 h-5 text-destructive mx-auto mb-2" />
                        <p className="text-2xl font-bold text-destructive">
                            {stats.todayStats?.cancelled || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Canceladas</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4 text-center border">
                        <TrendingDown className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                        <p className="text-2xl font-bold">
                            {stats.todayStats?.no_show || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">No-shows</p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default withRestaurantAuth(RestaurantDashboard);
