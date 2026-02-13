import { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Search, Check, Clock, AlertCircle, User, Phone, Users, MapPin, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';
import { useRestaurantReservations, useConfirmArrival } from '@/hooks/useData';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { Reservation } from '@/types';
import { format } from 'date-fns';
import QRScanner from '@/components/admin/QRScanner';
import { reservationService } from '@/services/api';

const ArrivalRegistrationPage = () => {
    const { restaurant } = useRestaurantAuth();
    const restaurantId = restaurant?.id;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isConfirmedLocal, setIsConfirmedLocal] = useState(false);
    const [autoArrivedMessage, setAutoArrivedMessage] = useState<string | null>(null);

    const { data: reservations = [], isLoading } = useRestaurantReservations(restaurantId, {
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'all' as any
    });

    const confirmArrivalMutation = useConfirmArrival();

    const filteredReservations = reservations.filter(a =>
        a.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const waiting = filteredReservations.filter(a => a.status === 'confirmed' || a.status === 'pending');
    const arrived = filteredReservations.filter(a => a.status === 'arrived');
    const completed = filteredReservations.filter(a => a.status === 'completed');
    const noShows = filteredReservations.filter(a => a.status === 'no_show');

    const handleConfirmArrival = async () => {
        if (!selectedReservation) return;
        try {
            await confirmArrivalMutation.mutateAsync(selectedReservation.id);
            setIsConfirmedLocal(true);
            setTimeout(() => {
                setIsConfirmOpen(false);
                setIsConfirmedLocal(false);
                setSelectedReservation(null);
            }, 1500);
        } catch (err) {
            console.error('Error confirming arrival:', err);
        }
    };

    // Handle QR scan result with auto-arrive
    const handleQRScanResult = async (decodedText: string) => {
        setIsScannerOpen(false);
        try {
            const { reservation, autoArrived } = await reservationService.verifyQR(decodedText, restaurantId!, true);
            if (reservation) {
                setSelectedReservation(reservation);
                if (autoArrived) {
                    // Auto-arrived: show direct confirmation
                    setAutoArrivedMessage('¡Llegada registrada automáticamente!');
                    setIsConfirmedLocal(true);
                    setIsConfirmOpen(true);
                    setTimeout(() => {
                        setIsConfirmOpen(false);
                        setIsConfirmedLocal(false);
                        setAutoArrivedMessage(null);
                        setSelectedReservation(null);
                    }, 2500);
                } else {
                    // Not auto-arrived (maybe already completed/cancelled)
                    setIsConfirmOpen(true);
                }
            }
        } catch (error) {
            console.error('QR Scan error:', error);
            alert('QR detectado: ' + decodedText + '\n\nError: ' + (error instanceof Error ? error.message : 'Reserva no encontrada'));
        }
    };

    // Handle manual code entry with auto-arrive
    const handleManualCode = async (code: string) => {
        if (!code) return;
        try {
            const { reservation, autoArrived } = await reservationService.verifyQR(code, restaurantId!, true);
            setSelectedReservation(reservation);
            setIsScannerOpen(false);
            if (autoArrived) {
                setAutoArrivedMessage('¡Llegada registrada automáticamente!');
                setIsConfirmedLocal(true);
                setIsConfirmOpen(true);
                setTimeout(() => {
                    setIsConfirmOpen(false);
                    setIsConfirmedLocal(false);
                    setAutoArrivedMessage(null);
                    setSelectedReservation(null);
                }, 2500);
            } else {
                setIsConfirmOpen(true);
            }
        } catch (err: any) {
            alert('Código inválido: ' + err.message);
        }
    };

    const ArrivalCard = ({ reservation }: { reservation: Reservation }) => (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cn('p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all',
                (reservation.status === 'confirmed' || reservation.status === 'pending') && 'bg-warning/5 border-warning/20',
                reservation.status === 'arrived' && 'bg-success/5 border-success/20',
                reservation.status === 'completed' && 'bg-blue-50 border-blue-200',
                reservation.status === 'no_show' && 'bg-destructive/5 border-destructive/20 opacity-60'
            )}
            onClick={() => {
                if (reservation.status === 'confirmed' || reservation.status === 'pending') {
                    setSelectedReservation(reservation);
                    setIsConfirmOpen(true);
                }
            }}>
            <div className="flex justify-between mb-3 gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 flex-shrink-0" /><span className="font-semibold truncate">{reservation.customerName}</span></div>
                    <p className="text-xs text-muted-foreground truncate">{reservation.customerPhone || 'Sin teléfono'}</p>
                </div>
                <Badge className={cn('flex-shrink-0 text-[10px] uppercase',
                    reservation.status === 'arrived' ? 'bg-success' :
                        reservation.status === 'completed' ? 'bg-blue-500' :
                            (reservation.status === 'confirmed' || reservation.status === 'pending') ? 'bg-warning text-warning-foreground' : 'bg-destructive'
                )}>
                    {reservation.status === 'arrived' ? 'En mesa' :
                        reservation.status === 'completed' ? 'Completado' :
                            (reservation.status === 'confirmed' || reservation.status === 'pending') ? 'Esperando' : 'No-show'}
                </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground"><Clock className="w-3.5 h-3.5" />{reservation.time.substring(0, 5)}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{reservation.guestCount} p.</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />M. {reservation.table?.number || '?'}</span>
            </div>
            {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                <Button size="sm" className="w-full mt-4 h-8 gap-2">
                    <Check className="w-4 h-4" />Marcar llegada
                </Button>
            )}
        </motion.div>
    );

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Cargando reservaciones del día...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Registro de Llegadas</h1>
                        <p className="text-muted-foreground">Gestiona la llegada de clientes hoy</p>
                    </div>
                    <Button onClick={() => setIsScannerOpen(true)} className="gap-2">
                        <QrCode className="w-5 h-5" />Escanear QR
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o número de reserva..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11"
                    />
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-warning/10 rounded-xl p-4 text-center border border-warning/20">
                        <Clock className="w-6 h-6 text-warning mx-auto mb-2" />
                        <p className="text-2xl font-bold text-warning">{waiting.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Esperando</p>
                    </div>
                    <div className="bg-success/10 rounded-xl p-4 text-center border border-success/20">
                        <Check className="w-6 h-6 text-success mx-auto mb-2" />
                        <p className="text-2xl font-bold text-success">{arrived.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">En Mesa</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                        <CheckCircle2 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-500">{completed.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Servidos</p>
                    </div>
                    <div className="bg-destructive/10 rounded-xl p-4 text-center border border-destructive/20">
                        <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                        <p className="text-2xl font-bold text-destructive">{noShows.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">No-shows</p>
                    </div>
                </div>

                <Tabs defaultValue="waiting">
                    <TabsList className="grid grid-cols-4 w-full max-w-lg mx-auto h-11">
                        <TabsTrigger value="waiting" className="text-xs sm:text-sm">Por llegar ({waiting.length})</TabsTrigger>
                        <TabsTrigger value="arrived" className="text-xs sm:text-sm">En Mesa ({arrived.length})</TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs sm:text-sm">Servidos ({completed.length})</TabsTrigger>
                        <TabsTrigger value="noshow" className="text-xs sm:text-sm">Faltas ({noShows.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="waiting" className="mt-6">
                        {waiting.length === 0 ? (
                            <div className="py-20 text-center border rounded-xl bg-muted/20 border-dashed">
                                <Clock className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                                <p className="text-muted-foreground">No hay reservaciones pendientes por llegar.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {waiting.map(a => <ArrivalCard key={a.id} reservation={a} />)}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="arrived" className="mt-6">
                        {arrived.length === 0 ? (
                            <div className="py-20 text-center border rounded-xl bg-muted/20 border-dashed">
                                <Check className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                                <p className="text-muted-foreground">Aún no se ha registrado ninguna llegada hoy.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {arrived.map(a => <ArrivalCard key={a.id} reservation={a} />)}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="completed" className="mt-6">
                        {completed.length === 0 ? (
                            <div className="py-20 text-center border rounded-xl bg-muted/20 border-dashed">
                                <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                                <p className="text-muted-foreground">No hay servicios completados hoy.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {completed.map(a => <ArrivalCard key={a.id} reservation={a} />)}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="noshow" className="mt-6">
                        {noShows.length === 0 ? (
                            <div className="py-20 text-center border rounded-xl bg-muted/20 border-dashed">
                                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                                <p className="text-muted-foreground">No hay inasistencias registradas.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {noShows.map(a => <ArrivalCard key={a.id} reservation={a} />)}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* QR Scanner Dialog */}
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Escanear QR de Reserva</DialogTitle></DialogHeader>
                        <div className="min-h-[300px] flex flex-col items-center justify-center">
                            {isScannerOpen && (
                                <QRScanner
                                    onScanSuccess={handleQRScanResult}
                                    onScanFailure={(err) => {
                                        // Optional: handle minor scan errors silently
                                    }}
                                />
                            )}

                            <div className="w-full mt-6 pt-6 border-t">
                                <p className="text-sm font-medium mb-2 text-center">O ingresa el código manualmente:</p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ej: MF-XXXXXX"
                                        id="manual-code"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const code = (e.target as HTMLInputElement).value;
                                                handleManualCode(code);
                                            }
                                        }}
                                    />
                                    <Button onClick={() => {
                                        const code = (document.getElementById('manual-code') as HTMLInputElement).value;
                                        handleManualCode(code);
                                    }}>Verificar</Button>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-center">
                            <Button variant="outline" onClick={() => setIsScannerOpen(false)} className="w-32">Cerrar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Confirm Arrival / Auto-Arrived Dialog */}
                <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                    <DialogContent>
                        {selectedReservation && (
                            isConfirmedLocal ? (
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Check className="w-12 h-12 text-success" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-success mb-2">
                                        {autoArrivedMessage || '¡Llegada confirmada!'}
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {selectedReservation.customerName} • Mesa {selectedReservation.table?.number || '?'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>Confirmar Registro de Llegada</DialogTitle>
                                    </DialogHeader>
                                    <div className="p-6 bg-card rounded-xl border-2 border-primary/10 my-4 shadow-sm">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                                {selectedReservation.customerName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xl">{selectedReservation.customerName}</p>
                                                <p className="text-muted-foreground">{selectedReservation.customerPhone || 'Sin datos de contacto'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 pt-4 border-t divide-x">
                                            <div className="text-center">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Hora</p>
                                                <p className="text-lg font-bold">{selectedReservation.time.substring(0, 5)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Personas</p>
                                                <p className="text-lg font-bold">{selectedReservation.guestCount}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mesa</p>
                                                <p className="text-lg font-bold">{selectedReservation.table?.number || '?'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter className="gap-2">
                                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="flex-1">Cancelar</Button>
                                        <Button
                                            onClick={handleConfirmArrival}
                                            className="flex-1 gap-2"
                                            disabled={confirmArrivalMutation.isPending}
                                        >
                                            {confirmArrivalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            Confirmar Llegada
                                        </Button>
                                    </DialogFooter>
                                </>
                            )
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default ArrivalRegistrationPage;
