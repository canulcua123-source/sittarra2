import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Filter, Calendar, Clock, Users,
    Check, X, MoreHorizontal, Phone, Mail, MessageSquare,
    Eye, Edit, Download, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';
import { useRestaurantReservations, useUpdateReservationStatus, useCompleteService } from '@/hooks/useData';
import { useRestaurantAuth, withRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { Reservation, ReservationStatus } from '@/types';
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ReservationsManagementPage = () => {
    const { restaurant } = useRestaurantAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Map date filter to actual date string for API
    const getDateString = () => {
        const today = new Date();
        if (dateFilter === 'today') return format(today, 'yyyy-MM-dd');
        if (dateFilter === 'tomorrow') {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            return format(tomorrow, 'yyyy-MM-dd');
        }
        // For week and month, we fetch all and filter on client side
        // to avoid complex backend queries for now
        return undefined;
    };

    const {
        data: reservations = [],
        isLoading,
        error
    } = useRestaurantReservations(restaurant?.id, {
        status: statusFilter !== 'all' ? statusFilter as any : undefined,
        date: getDateString()
    });

    const updateStatusMutation = useUpdateReservationStatus();
    const completeServiceMutation = useCompleteService();

    const handleStatusUpdate = async (reservationId: string, status: ReservationStatus) => {
        try {
            await updateStatusMutation.mutateAsync({ reservationId, status });

            // Show success notification based on action
            const messages: Record<string, string> = {
                'confirmed': '✅ Reserva confirmada. El cliente ha sido notificado.',
                'cancelled': '❌ Reserva cancelada exitosamente.',
                'arrived': '🎉 Llegada registrada. ¡Bienvenido el cliente!',
                'completed': '✓ Reserva completada.',
                'no_show': '⚠️ Reserva marcada como no asistió.'
            };

            toast.success(messages[status] || `Estado actualizado a: ${status}`);
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('Error al actualizar el estado de la reserva');
        }
    };

    const handleCompleteService = async (reservationId: string) => {
        try {
            await completeServiceMutation.mutateAsync(reservationId);
            toast.success('✅ Servicio completado. Mesa liberada.');
        } catch (err) {
            console.error('Error completing service:', err);
            toast.error('Error al completar el servicio');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-success text-success-foreground">Confirmada</Badge>;
            case 'pending':
                return <Badge className="bg-warning text-warning-foreground">Pendiente</Badge>;
            case 'cancelled':
                return <Badge className="bg-destructive text-destructive-foreground">Cancelada</Badge>;
            case 'completed':
                return <Badge className="bg-primary text-primary-foreground">Completada</Badge>;
            case 'arrived':
                return <Badge className="bg-info text-info-foreground">Llegó</Badge>;
            case 'no_show':
                return <Badge className="bg-muted text-muted-foreground">No asistió</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredReservations = reservations.filter(res => {
        // 1. Search filter
        const name = res.customerName || '';
        const id = res.id || '';
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            id.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // 2. Client-side date filtering for 'week' and 'month'
        // 'today', 'tomorrow' and 'all' are handled by the API or return all
        if (dateFilter === 'week') {
            try {
                const resDate = parseISO(res.date);
                const today = new Date();
                const weekStart = startOfWeek(today, { locale: es });
                const weekEnd = endOfWeek(today, { locale: es });
                return isWithinInterval(resDate, { start: weekStart, end: weekEnd });
            } catch (e) {
                return true;
            }
        }

        if (dateFilter === 'month') {
            try {
                const resDate = parseISO(res.date);
                const today = new Date();
                const monthStart = startOfMonth(today);
                const monthEnd = endOfMonth(today);
                return isWithinInterval(resDate, { start: monthStart, end: monthEnd });
            } catch (e) {
                return true;
            }
        }

        return true;
    });

    const pendingCount = reservations.filter(r => r.status === 'pending').length;
    const confirmedCount = reservations.filter(r => r.status === 'confirmed').length;

    const handleExport = () => {
        if (!reservations.length) {
            toast.error('No hay datos para exportar');
            return;
        }

        const headers = ['ID', 'Cliente', 'Teléfono', 'Fecha', 'Hora', 'Mesa', 'Personas', 'Estado', 'Anticipo', 'Solicitud Especial'];
        const csvContent = [
            headers.join(','),
            ...reservations.map(r => [
                r.id,
                `"${r.customerName}"`,
                `"${r.customerPhone || ''}"`,
                r.date,
                r.time,
                r.table?.number || 'Sin mesa',
                r.guestCount,
                r.status,
                r.depositAmount || 0,
                `"${r.specialRequest || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reservas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Archivo exportado exitosamente');
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Cargando reservaciones...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <Alert variant="destructive" className="my-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        No se pudieron cargar las reservaciones. Por favor intenta de nuevo.
                    </AlertDescription>
                </Alert>
                <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Gestión de Reservas</h1>
                        <p className="text-muted-foreground">
                            {pendingCount} pendientes • {confirmedCount} confirmadas
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={handleExport}>
                            <Download className="w-4 h-4" />
                            Exportar
                        </Button>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-40">
                                <Calendar className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Fecha" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Hoy</SelectItem>
                                <SelectItem value="tomorrow">Mañana</SelectItem>
                                <SelectItem value="week">Esta semana</SelectItem>
                                <SelectItem value="month">Este mes</SelectItem>
                                <SelectItem value="all">Todas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o código..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="pending">Pendientes</SelectItem>
                            <SelectItem value="confirmed">Confirmadas</SelectItem>
                            <SelectItem value="cancelled">Canceladas</SelectItem>
                            <SelectItem value="completed">Completadas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Tabs View */}
                <Tabs defaultValue="list" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="list">Lista</TabsTrigger>
                        <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-4">
                        <div className="bg-card rounded-xl shadow-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[100px]">Código</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Hora</TableHead>
                                            <TableHead>Mesa</TableHead>
                                            <TableHead>Personas</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Anticipo</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredReservations.map((reservation) => (
                                            <TableRow
                                                key={reservation.id}
                                                className="group hover:bg-muted/30 transition-colors"
                                            >
                                                <TableCell className="font-mono font-medium text-xs">
                                                    {reservation.id.split('-')[0].toUpperCase()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{reservation.customerName}</span>
                                                        <span className="text-xs text-muted-foreground">{reservation.customerPhone || 'Sin teléfono'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{reservation.time.substring(0, 5)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={reservation.table?.number ? "outline" : "secondary"} className="text-xs font-normal">
                                                        {reservation.table?.number ? `Mesa ${reservation.table.number}` : 'Por asignar'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Users className="w-3 h-3" />
                                                        <span>{reservation.guestCount}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(reservation.status)}
                                                </TableCell>
                                                <TableCell>
                                                    {reservation.depositPaid ? (
                                                        <Badge variant="outline" className="text-success border-success/20 bg-success/5">
                                                            ${reservation.depositAmount}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                                                        {reservation.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                                                                    onClick={() => handleStatusUpdate(reservation.id, 'confirmed')}
                                                                    title="Aceptar Reserva"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleStatusUpdate(reservation.id, 'cancelled')}
                                                                    title="Rechazar Reserva"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setSelectedReservation(reservation);
                                                                        setIsDetailOpen(true);
                                                                    }}
                                                                    className="gap-2"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                    Ver detalles
                                                                </DropdownMenuItem>
                                                                {reservation.customerPhone && (
                                                                    <DropdownMenuItem className="gap-2">
                                                                        <Phone className="w-4 h-4" />
                                                                        Llamar cliente
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                {reservation.status === 'confirmed' && (
                                                                    <DropdownMenuItem
                                                                        className="gap-2 text-primary focus:text-primary"
                                                                        onClick={() => handleStatusUpdate(reservation.id, 'arrived')}
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                        Marcar llegada
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {reservation.status === 'arrived' && (
                                                                    <DropdownMenuItem
                                                                        className="gap-2 text-success focus:text-success"
                                                                        onClick={() => handleCompleteService(reservation.id)}
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                        Completar Servicio
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {reservation.status !== 'cancelled' && (
                                                                    <DropdownMenuItem
                                                                        className="gap-2 text-destructive focus:text-destructive"
                                                                        onClick={() => handleStatusUpdate(reservation.id, 'cancelled')}
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                        Cancelar reserva
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {filteredReservations.length === 0 && (
                                <div className="text-center py-16 px-4">
                                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Calendar className="w-8 h-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="font-medium text-lg mb-1">Sin reservaciones</h3>
                                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">No se encontraron reservas con los filtros actuales.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="timeline">
                        <div className="bg-card rounded-xl p-6 shadow-card">
                            <div className="space-y-4">
                                {filteredReservations.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground text-sm">No hay reservaciones para mostrar en la línea de tiempo</p>
                                    </div>
                                ) : (
                                    filteredReservations.map((reservation, index) => (
                                        <div key={reservation.id} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className={cn(
                                                    'w-10 h-10 rounded-full flex items-center justify-center',
                                                    reservation.status === 'confirmed' ? 'bg-success/20 text-success' :
                                                        reservation.status === 'pending' ? 'bg-warning/20 text-warning' :
                                                            reservation.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                                                )}>
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                {index < filteredReservations.length - 1 && (
                                                    <div className="w-0.5 h-full bg-muted my-2" />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold">{reservation.time.substring(0, 5)} - {reservation.customerName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {reservation.table?.number ? `Mesa ${reservation.table.number}` : 'Sin mesa'} • {reservation.guestCount} personas
                                                        </p>
                                                        {reservation.occasion && (
                                                            <Badge variant="outline" className="mt-2 text-xs">{reservation.occasion}</Badge>
                                                        )}
                                                    </div>
                                                    {getStatusBadge(reservation.status)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Detail Dialog */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-lg">
                        {selectedReservation && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        Reserva {selectedReservation.id.split('-')[0].toUpperCase()}
                                        {getStatusBadge(selectedReservation.status)}
                                    </DialogTitle>
                                    <DialogDescription>
                                        Creada el {selectedReservation.createdAt ? format(new Date(selectedReservation.createdAt), 'PPP', { locale: es }) : 'N/A'}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Cliente</p>
                                            <p className="font-medium">{selectedReservation.customerName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Teléfono</p>
                                            <p className="font-medium">{selectedReservation.customerPhone || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fecha y Hora</p>
                                            <p className="font-medium">{format(new Date(selectedReservation.date + 'T12:00:00'), 'PP', { locale: es })} • {selectedReservation.time.substring(0, 5)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Mesa / Personas</p>
                                            <p className="font-medium">
                                                {selectedReservation.table?.number ? `Mesa ${selectedReservation.table.number}` : 'Sin mesa'} • {selectedReservation.guestCount} personas
                                            </p>
                                        </div>
                                    </div>

                                    {selectedReservation.specialRequest && (
                                        <div className="p-3 rounded-lg bg-muted/50 border">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Solicitud especial</p>
                                            <p className="text-sm italic">"{selectedReservation.specialRequest}"</p>
                                        </div>
                                    )}

                                    {selectedReservation.depositPaid && (
                                        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                                            <p className="text-sm text-success font-medium flex items-center gap-2">
                                                <Check className="w-4 h-4" />
                                                Anticipo pagado: ${selectedReservation.depositAmount} MXN
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
                                    <Button variant="outline" className="gap-2" onClick={() => setIsDetailOpen(false)}>
                                        Cerrar
                                    </Button>
                                    {selectedReservation.customerPhone && (
                                        <Button variant="outline" className="gap-2">
                                            <Phone className="w-4 h-4" />
                                            Llamar
                                        </Button>
                                    )}
                                    {selectedReservation.status === 'pending' && (
                                        <Button
                                            className="gap-2"
                                            onClick={() => {
                                                handleStatusUpdate(selectedReservation.id, 'confirmed');
                                                setIsDetailOpen(false);
                                            }}
                                        >
                                            <Check className="w-4 h-4" />
                                            Confirmar Reserva
                                        </Button>
                                    )}
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default withRestaurantAuth(ReservationsManagementPage);
