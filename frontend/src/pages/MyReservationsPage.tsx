import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, Users, QrCode, Star, ExternalLink, X, Loader2,
  CheckCircle2, AlertCircle, Timer, ChevronRight
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RatingModal from '@/components/rating/RatingModal';
import { useRestaurants, useUserReservations, useCancelReservation, useCreateReview } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Reservation } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const MyReservationsPage = () => {
  const { user } = useAuth();
  const { data: restaurants = [] } = useRestaurants();
  const { data: reservations = [], isLoading: reservationsLoading, refetch } = useUserReservations(user?.id);
  const cancelReservation = useCancelReservation();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingReservation, setRatingReservation] = useState<Reservation | null>(null);
  const createReview = useCreateReview();
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => {
    // Load from localStorage to persist across sessions
    const stored = localStorage.getItem('mesafeliz_reviewed_reservations');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Get today's date string (using LOCAL timezone, not UTC)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Split reservations: TODAY first, then upcoming, then past
  const todayReservations = reservations.filter(r =>
    r.date === today && r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'no_show'
  );
  const upcomingReservations = reservations.filter(r =>
    r.date > today && r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'no_show'
  );
  const pastReservations = reservations.filter(r =>
    r.date < today || r.status === 'completed' || r.status === 'cancelled' || r.status === 'no_show'
  );

  const allUpcoming = [...todayReservations, ...upcomingReservations];

  const handleCancelClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };

  const handleQrClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setQrDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReservation) return;
    try {
      await cancelReservation.mutateAsync({ reservationId: selectedReservation.id });
      toast.success('Reserva cancelada exitosamente');
      refetch();
    } catch {
      toast.error('Error al cancelar la reserva');
    }
    setCancelDialogOpen(false);
    setSelectedReservation(null);
  };

  const handleRateClick = (reservation: Reservation) => {
    setRatingReservation(reservation);
    setRatingModalOpen(true);
  };

  const handleSubmitRating = async (data: any) => {
    if (!ratingReservation || !user) return;

    try {
      await createReview.mutateAsync({
        restaurantId: ratingReservation.restaurantId,
        reservationId: ratingReservation.id,
        userId: user.id,
        rating: data.overallRating,
        foodRating: data.foodRating,
        serviceRating: data.serviceRating,
        ambianceRating: data.ambianceRating,
        valueRating: data.valueRating,
        comment: data.comment,
        tags: data.tags,
        photos: []
      });

      const newReviewedIds = new Set(reviewedIds);
      newReviewedIds.add(ratingReservation.id);
      setReviewedIds(newReviewedIds);
      localStorage.setItem('mesafeliz_reviewed_reservations', JSON.stringify([...newReviewedIds]));

      toast.success('¡Gracias por tu opinión!');
      setRatingModalOpen(false);
      refetch(); // Refresh to update hasReview flag
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar la calificación');
    }
  };

  // Auto-show rating modal for completed reservations without review
  useEffect(() => {
    if (!reservationsLoading && reservations.length > 0) {
      const completedWithoutReview = reservations.find(
        r => r.status === 'completed' && !r.hasReview && !reviewedIds.has(r.id)
      );
      if (completedWithoutReview && !ratingModalOpen) {
        // Small delay for better UX
        setTimeout(() => {
          setRatingReservation(completedWithoutReview);
          setRatingModalOpen(true);
        }, 1000);
      }
    }
  }, [reservations, reservationsLoading, reviewedIds, ratingModalOpen]);

  // Calculate time until reservation
  const getTimeUntil = (date: string, time: string) => {
    const reservationDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diff = reservationDate.getTime() - now.getTime();
    if (diff <= 0) return { text: 'Ahora', urgent: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours < 1) return { text: `En ${minutes} min`, urgent: true };
    if (hours < 3) return { text: `En ${hours}h ${minutes}m`, urgent: true };
    if (hours < 24) return { text: `En ${hours} horas`, urgent: false };
    const days = Math.floor(hours / 24);
    return { text: `En ${days} día${days > 1 ? 's' : ''}`, urgent: false };
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Confirmada' };
      case 'pending':
        return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pendiente' };
      case 'arrived':
        return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'En restaurante' };
      case 'completed':
        return { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Completada' };
      case 'cancelled':
        return { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelada' };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: status };
    }
  };

  const ReservationCard = ({ reservation, isToday = false, isPast = false }: {
    reservation: Reservation, isToday?: boolean, isPast?: boolean
  }) => {
    const restaurant = restaurants.find(r => r.id === reservation.restaurantId);
    if (!restaurant) return null;

    const canRate = isPast && reservation.status === 'completed' && !reservation.hasReview && !reviewedIds.has(reservation.id);
    const statusConfig = getStatusConfig(reservation.status);
    const timeUntil = !isPast ? getTimeUntil(reservation.date, reservation.time) : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-white rounded-xl border shadow-sm overflow-hidden transition-all",
          isToday ? "border-primary ring-1 ring-primary/20" : "border-border",
          !isPast && "hover:shadow-md"
        )}
      >
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-44 h-36 md:h-auto relative">
            <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
            {isToday && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs font-semibold rounded">
                HOY
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <Link to={`/restaurante/${restaurant.id}`} className="hover:text-primary transition-colors">
                  <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                </Link>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {restaurant.zone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {timeUntil && (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    timeUntil.urgent ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground"
                  )}>
                    <Timer className="h-3 w-3 inline mr-1" />
                    {timeUntil.text}
                  </span>
                )}
                <span className={cn("text-xs px-2.5 py-1 rounded-full border", statusConfig.bg, statusConfig.border, statusConfig.color)}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-4 gap-2 text-sm mb-3">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{isToday ? 'Hoy' : new Date(reservation.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{reservation.time.substring(0, 5)}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{reservation.guestCount || reservation.guests}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">{reservation.qrCode?.slice(-6) || reservation.id.slice(0, 6).toUpperCase()}</span>
              </div>
            </div>

            {/* Deposit Info */}
            {reservation.depositPaid && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 mb-3">
                <CheckCircle2 className="h-4 w-4" />
                <span>Anticipo: ${reservation.depositAmount} MXN</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t">
              {!isPast && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleQrClick(reservation)}>
                    <QrCode className="h-4 w-4 mr-1.5" />
                    Código QR
                  </Button>
                  <Link to={`/restaurante/${restaurant.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Ver restaurante
                    </Button>
                  </Link>
                  {reservation.status !== 'cancelled' && reservation.status !== 'arrived' && (
                    <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => handleCancelClick(reservation)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </>
              )}
              {isPast && (
                <>
                  <Link to={`/reservar/${restaurant.id}`}>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-1.5" />
                      Reservar de nuevo
                    </Button>
                  </Link>
                  {canRate && (
                    <Button size="sm" onClick={() => handleRateClick(reservation)}>
                      <Star className="h-4 w-4 mr-1.5" />
                      Calificar
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">Mis Reservas</h1>
            <p className="text-muted-foreground text-sm">Gestiona tus reservaciones</p>
          </div>

          {/* Today Alert */}
          {todayReservations.length > 0 && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-primary text-sm">
                  {todayReservations.length === 1 ? '¡Tienes una reserva para hoy!' : `¡Tienes ${todayReservations.length} reservas para hoy!`}
                </p>
                <p className="text-xs text-muted-foreground">No olvides tu código QR</p>
              </div>
              <ChevronRight className="h-4 w-4 text-primary" />
            </div>
          )}

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="active" className="gap-2">
                <Calendar className="h-4 w-4" />
                Próximas
                {allUpcoming.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{allUpcoming.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Clock className="h-4 w-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <AnimatePresence mode="wait">
                {reservationsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : allUpcoming.length > 0 ? (
                  <div className="space-y-4">
                    {todayReservations.length > 0 && (
                      <>
                        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Hoy</h2>
                        {todayReservations.map((r) => <ReservationCard key={r.id} reservation={r} isToday />)}
                      </>
                    )}
                    {upcomingReservations.length > 0 && (
                      <>
                        {todayReservations.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-4">Próximas</h2>}
                        {upcomingReservations.map((r) => <ReservationCard key={r.id} reservation={r} />)}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">No tienes reservas próximas</h3>
                    <p className="text-sm text-muted-foreground mb-4">Explora los mejores restaurantes de Mérida</p>
                    <Link to="/restaurantes">
                      <Button>Explorar restaurantes</Button>
                    </Link>
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="history">
              <AnimatePresence mode="wait">
                {reservationsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pastReservations.length > 0 ? (
                  <div className="space-y-4">
                    {pastReservations.map((r) => <ReservationCard key={r.id} reservation={r} isPast />)}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Sin historial</h3>
                    <p className="text-sm text-muted-foreground">Tus reservas completadas aparecerán aquí</p>
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>Código de Reserva</DialogTitle>
            <DialogDescription>Muestra este código al llegar</DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="flex flex-col items-center py-4">
              <div className="p-3 bg-white rounded-lg border shadow-sm mb-3">
                <QRCode value={selectedReservation.qrCode || selectedReservation.id} size={160} />
              </div>
              <p className="font-mono text-2xl font-bold tracking-wider">
                {selectedReservation.qrCode?.slice(-8) || selectedReservation.id.split('-')[0].toUpperCase()}
              </p>
              <Badge variant={selectedReservation.status === 'confirmed' ? 'default' : 'secondary'} className="mt-2">
                {selectedReservation.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              ¿Cancelar reserva?
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Esta acción no se puede deshacer.</p>
          {selectedReservation && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">Código: {selectedReservation.qrCode?.slice(-8) || selectedReservation.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-muted-foreground">
                {new Date(selectedReservation.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} - {selectedReservation.time?.substring(0, 5)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>No, mantener</Button>
            <Button variant="destructive" onClick={handleConfirmCancel} disabled={cancelReservation.isPending}>
              {cancelReservation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Cancelar reserva
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      {ratingReservation && (
        <RatingModal
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          restaurantName={restaurants.find(r => r.id === ratingReservation.restaurantId)?.name || ''}
          reservationDate={format(new Date(ratingReservation.date), 'dd/MM/yyyy')}
          reservationId={ratingReservation.id}
          restaurantId={ratingReservation.restaurantId}
          onSubmit={handleSubmitRating}
          isSubmitting={createReview.isPending}
        />
      )}

      <Footer />
    </div>
  );
};

export default MyReservationsPage;
