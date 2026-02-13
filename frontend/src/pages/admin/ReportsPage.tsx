import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Users, Calendar, DollarSign, Clock, PieChart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';
import { useDashboardMetrics, useRestaurantOffers, useRestaurantReservations, useReports } from '@/hooks/useData';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';

const ReportsPage = () => {
    const { restaurant } = useRestaurantAuth();
    const restaurantId = restaurant?.id;

    const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
    const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetrics(restaurantId);
    const { data: offers = [], isLoading: isOffersLoading } = useRestaurantOffers(restaurantId);
    const { data: reports = [], isLoading: isReportsLoading } = useReports(period);

    // Use real data or empty array if loading
    const weeklyData = reports;

    if (isMetricsLoading || isOffersLoading || isReportsLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2">Generando reportes detallados...</span>
                </div>
            </AdminLayout>
        );
    }

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

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Reportes de Rendimiento</h1>
                        <p className="text-muted-foreground">Análisis de la operación y eficiencia de tu restaurante</p>
                    </div>
                    <div className="flex gap-2">
                        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                            <SelectTrigger className="w-40">
                                <Calendar className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Esta semana</SelectItem>
                                <SelectItem value="month">Este mes</SelectItem>
                                <SelectItem value="quarter">Este trimestre</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Exportar PDF</Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border">
                        <div className="flex justify-between items-start mb-4">
                            <Calendar className="w-8 h-8 text-primary/50" />
                            <span className={cn("text-xs flex items-center gap-1", stats.reservationsChange >= 0 ? "text-success" : "text-destructive")}>
                                {stats.reservationsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(stats.reservationsChange)}%
                            </span>
                        </div>
                        <p className="text-3xl font-bold">{stats.reservationsToday * 30}</p> {/* Extrapolated for month */}
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Reservas del Mes</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-6 shadow-card border">
                        <div className="flex justify-between items-start mb-4">
                            <Users className="w-8 h-8 text-success/50" />
                        </div>
                        <p className="text-3xl font-bold">{stats.currentOccupancy}%</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Ocupación Promedio</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl p-6 shadow-card border">
                        <div className="flex justify-between items-start mb-4">
                            <DollarSign className="w-8 h-8 text-secondary/50" />
                            <span className={cn("text-xs flex items-center gap-1", stats.revenueChange >= 0 ? "text-success" : "text-destructive")}>
                                {stats.revenueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(stats.revenueChange)}%
                            </span>
                        </div>
                        <p className="text-3xl font-bold">${(stats.expectedRevenue * 25 / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Ingresos Mensuales</p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl p-6 shadow-card border">
                        <div className="flex justify-between items-start mb-4">
                            <Clock className="w-8 h-8 text-warning/50" />
                        </div>
                        <p className="text-3xl font-bold">{stats.noShowRate}%</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Tasa de No-show</p>
                    </motion.div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-card rounded-xl p-6 shadow-card border">
                        <h3 className="text-xl font-display font-semibold mb-6">Actividad por Día (Promedio Semanal)</h3>
                        <div className="space-y-4">
                            {weeklyData.map(d => (
                                <div key={d.day} className="flex items-center gap-4">
                                    <span className="w-12 font-medium text-sm">{d.day}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Ocupación</span>
                                            <span className="text-[10px] font-bold">{d.occupancy}%</span>
                                        </div>
                                        <Progress value={d.occupancy} className="h-2" />
                                    </div>
                                    <div className="w-16 text-right">
                                        <span className="text-sm font-bold">{d.reservations}</span>
                                        <p className="text-[9px] text-muted-foreground">RES.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-card rounded-xl p-6 shadow-card border">
                        <h3 className="text-xl font-display font-semibold mb-6">Efectividad de Promociones</h3>
                        <div className="space-y-4">
                            {offers.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <PieChart className="w-10 h-10 mx-auto mb-2" />
                                    <p className="text-sm">No hay datos de ofertas disponibles</p>
                                </div>
                            ) : (
                                offers.map((offer, i) => {
                                    const usages = offer.usageCount || 0;
                                    const estimatedImpact = usages * (metrics?.expectedRevenue || 500) / 10;
                                    return (
                                        <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold text-sm">{offer.title}</span>
                                                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                                    +${(estimatedImpact / 1000).toFixed(1)}k est.
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>{usages} veces aplicada</span>
                                                <span>{offer.isActive ? 'Activa ahora' : 'Pausada'}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-xl p-4 text-center border">
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-2">Día más ocupado</p>
                        <p className="text-xl font-bold">Sábado</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 text-center border">
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-2">Hora pico</p>
                        <p className="text-xl font-bold">20:00 - 22:00</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 text-center border">
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-2">Ticket Promedio</p>
                        <p className="text-xl font-bold">${(stats.expectedRevenue / (stats.reservationsToday || 1)).toFixed(0)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 text-center border">
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-2">Rating Sistema</p>
                        <p className="text-xl font-bold text-warning">{stats.averageRating}★</p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default ReportsPage;
