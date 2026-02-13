import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Calendar, Users, Heart, Gift, Briefcase, PartyPopper, MessageSquare, CreditCard, Check, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TableMap from '@/components/TableMap';
import TimeSlotPicker from '@/components/TimeSlotPicker';
import StripePaymentModal from '@/components/StripePaymentModal';
import { useRestaurant, useAvailableTables, useTimeSlots, useCreateReservation } from '@/hooks/useData';
import { Table } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ReservationStep = 'date' | 'time' | 'table' | 'details' | 'confirm';

const occasions = [
  { id: 'romantic', label: 'Cena romántica', icon: Heart },
  { id: 'birthday', label: 'Cumpleaños', icon: PartyPopper },
  { id: 'business', label: 'Reunión de negocios', icon: Briefcase },
  { id: 'other', label: 'Ocasión especial', icon: Gift },
];

const ReservationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch restaurant data from API
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(id);

  const [step, setStep] = useState<ReservationStep>('date');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedMesa, setSelectedMesa] = useState<Table | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [specialRequest, setSpecialRequest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Auto-scroll to bottom when a table is selected to show the "Continue" button
  useEffect(() => {
    if (selectedMesa && step === 'table') {
      setTimeout(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [selectedMesa, step]);

  // Fetch time slots for selected date
  const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const { data: timeSlots = [] } = useTimeSlots(id || '', dateStr);

  // Fetch available tables based on date, time, and guest count
  const { data: availableTables = [], isLoading: tablesLoading } = useAvailableTables(
    id || '',
    dateStr,
    selectedTime || '',
    guestCount
  );

  // Create reservation mutation
  const createReservation = useCreateReservation();

  const isLoading = authLoading || restaurantLoading;

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-28 pb-20">
          <div className="container mx-auto px-4 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-8 shadow-card text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="h-10 w-10 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-4">Inicia sesión para reservar</h1>
              <p className="text-muted-foreground mb-8">
                Para hacer una reserva en {restaurant?.name || 'nuestros restaurantes'}, necesitas iniciar sesión o crear una cuenta.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate('/login', { state: { from: `/reservar/${id}` } })}
                  className="flex-1"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/restaurante/${id}`)}
                  className="flex-1"
                >
                  Volver al restaurante
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                ¿No tienes cuenta? <Link to="/login" state={{ from: `/reservar/${id}` }} className="text-primary hover:underline">Regístrate aquí</Link>
              </p>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Restaurante no encontrado</h1>
          <Link to="/restaurantes">
            <Button>Volver a restaurantes</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Find selected time slot and check if deposit is required
  const selectedSlot = selectedTime ? timeSlots.find(s => s.time === selectedTime) : null;
  const requiresDeposit = selectedSlot?.requiresDeposit || false;
  const depositAmount = selectedSlot?.depositAmount || 0;


  const handleNext = () => {
    const steps: ReservationStep[] = ['date', 'time', 'table', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: ReservationStep[] = ['date', 'time', 'table', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleConfirm = async () => {
    if (!user || !selectedMesa || !selectedDate || !selectedTime) {
      toast.error('Faltan datos para completar la reserva');
      return;
    }

    // If deposit is required, open payment modal first
    if (requiresDeposit && depositAmount && depositAmount > 0) {
      setShowPaymentModal(true);
      return;
    }

    // No deposit required, create reservation directly
    await createReservationDirectly();
  };

  const createReservationDirectly = async (depositPaid = false) => {
    if (!user || !selectedMesa || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      await createReservation.mutateAsync({
        restaurantId: id!,
        userId: user.id,
        tableId: selectedMesa.id,
        date: dateStr,
        time: selectedTime,
        guestCount: guestCount,
        status: depositPaid ? 'confirmed' : 'pending',
        specialRequest: specialRequest || undefined,
        occasion: selectedOccasion || undefined,
        depositPaid,
        depositAmount: depositPaid ? depositAmount : 0,
      });
      toast.success('¡Reserva creada exitosamente!');
      setIsConfirmed(true);
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast.error(error.message || 'Error al crear la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    createReservationDirectly(true);
  };

  const canProceed = () => {
    switch (step) {
      case 'date': return !!selectedDate;
      case 'time': return !!selectedTime;
      case 'table': return !!selectedMesa;
      case 'details': return guestCount >= 1;
      default: return true;
    }
  };

  const stepTitles: Record<ReservationStep, string> = {
    date: 'Selecciona la fecha',
    time: 'Elige el horario',
    table: 'Escoge tu mesa',
    details: 'Detalles de la reserva',
    confirm: 'Confirmar reserva',
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-28 pb-20">
          <div className="container mx-auto px-4 max-w-2xl">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="h-12 w-12 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-4">¡Solicitud enviada!</h1>
              <p className="text-muted-foreground mb-8">
                Tu reserva ha sido registrada y está pendiente de confirmación por el restaurante.
                Te notificaremos cuando sea aceptada.
              </p>

              <div className="bg-card rounded-2xl p-6 shadow-card text-left mb-8">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Restaurante</span>
                    <span className="font-medium">{restaurant.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="font-medium">{selectedDate?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mesa</span>
                    <span className="font-medium">Mesa {selectedMesa?.number} ({selectedMesa?.capacity} personas)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Personas</span>
                    <span className="font-medium">{guestCount}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    Código de reserva
                  </p>
                  <p className="text-2xl font-bold text-center text-primary mt-2">
                    RES-{Math.random().toString(36).substr(2, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/mis-reservas" className="flex-1">
                  <Button variant="outline" className="w-full">Ver mis reservas</Button>
                </Link>
                <Link to="/" className="flex-1">
                  <Button className="w-full">Volver al inicio</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back & Progress */}
          <div className="mb-8">
            <button
              onClick={() => step === 'date' ? navigate(`/restaurante/${id}`) : handleBack()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ChevronLeft className="h-5 w-5" />
              {step === 'date' ? 'Volver al restaurante' : 'Paso anterior'}
            </button>

            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              {['date', 'time', 'table', 'details', 'confirm'].map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300 flex-1',
                    ['date', 'time', 'table', 'details', 'confirm'].indexOf(step) >= i
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Restaurant Mini Card */}
          <div className="bg-card rounded-xl p-4 shadow-soft mb-8 flex items-center gap-4">
            <img
              src={restaurant.image}
              alt={restaurant.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h2 className="font-display font-semibold">{restaurant.name}</h2>
              <p className="text-sm text-muted-foreground">{restaurant.address}</p>
            </div>
          </div>

          {/* Step Title */}
          <motion.h1
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-display text-2xl md:text-3xl font-bold mb-6"
          >
            {stepTitles[step]}
          </motion.h1>

          {/* Step Content */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {step === 'date' && (
              <div className="bg-card rounded-2xl p-8 shadow-lg border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Label className="text-lg font-semibold">¿Cuándo deseas visitarnos?</Label>
                    <p className="text-sm text-muted-foreground">Selecciona la fecha de tu reservación</p>
                  </div>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    // Compare dates at start of day to allow same-day reservations
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const compareDate = new Date(date);
                    compareDate.setHours(0, 0, 0, 0);
                    return compareDate < today;
                  }}
                  className="rounded-xl border-2 border-border/50 p-4 mx-auto"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-base font-semibold",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-muted rounded-lg transition-all",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-10 font-medium text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-10 w-10 p-0 font-medium aria-selected:opacity-100 hover:bg-primary/10 rounded-lg transition-all",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-lg",
                    day_today: "bg-accent text-accent-foreground font-bold ring-2 ring-primary/30",
                    day_outside: "text-muted-foreground/30",
                    day_disabled: "text-muted-foreground/30 cursor-not-allowed hover:bg-transparent",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                />
                {selectedDate && (
                  <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                    <p className="text-sm text-muted-foreground">Fecha seleccionada:</p>
                    <p className="text-lg font-bold text-primary capitalize">
                      {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 'time' && (
              <TimeSlotPicker
                timeSlots={timeSlots}
                selectedTime={selectedTime}
                onSelectTime={setSelectedTime}
              />
            )}

            {step === 'table' && (
              <div className="space-y-6">
                <div className="bg-card rounded-2xl p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">¿Cuántas personas?</Label>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <button
                        key={num}
                        onClick={() => setGuestCount(num)}
                        className={cn(
                          'w-12 h-12 rounded-xl font-semibold transition-all duration-200',
                          guestCount === num
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <TableMap
                  tables={availableTables}
                  selectedTableId={selectedMesa?.id}
                  onTableSelect={(table) => setSelectedMesa(table)}
                  isLoading={tablesLoading}
                />
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-6">
                {/* Occasion */}
                <div className="bg-card rounded-2xl p-6 shadow-card">
                  <Label className="text-base font-medium mb-4 block">
                    ¿Es una ocasión especial? (opcional)
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {occasions.map((occasion) => (
                      <button
                        key={occasion.id}
                        onClick={() => setSelectedOccasion(
                          selectedOccasion === occasion.id ? null : occasion.id
                        )}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all duration-200 text-center',
                          selectedOccasion === occasion.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <occasion.icon className={cn(
                          'h-6 w-6 mx-auto mb-2',
                          selectedOccasion === occasion.id ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <span className="text-sm font-medium">{occasion.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Special Request */}
                <div className="bg-card rounded-2xl p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">
                      ¿Deseas agregar algo a tu mesa? (opcional)
                    </Label>
                  </div>
                  <Textarea
                    placeholder="Ej: Cumpleaños sorpresa, alergias alimentarias, silla para bebé..."
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>
              </div>
            )}

            {step === 'confirm' && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-card rounded-2xl p-6 shadow-card">
                  <h3 className="font-display text-lg font-semibold mb-4">Resumen de tu reserva</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Fecha</span>
                      <span className="font-medium">
                        {selectedDate?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Hora</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Mesa</span>
                      <span className="font-medium">Mesa {selectedMesa?.number}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Personas</span>
                      <span className="font-medium">{guestCount}</span>
                    </div>
                    {selectedOccasion && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Ocasión</span>
                        <span className="font-medium">
                          {occasions.find(o => o.id === selectedOccasion)?.label}
                        </span>
                      </div>
                    )}
                    {specialRequest && (
                      <div className="py-2">
                        <span className="text-muted-foreground block mb-1">Solicitud especial</span>
                        <span className="font-medium">{specialRequest}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deposit Notice */}
                {requiresDeposit && (
                  <div className="bg-warning/10 rounded-2xl p-6 border border-warning/20">
                    <div className="flex items-start gap-4">
                      <CreditCard className="h-6 w-6 text-warning mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground">Anticipo requerido</h4>
                        <p className="text-muted-foreground mt-1">
                          Este horario requiere un anticipo de <span className="font-bold text-foreground">${depositAmount} MXN</span> para confirmar la reserva.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          El anticipo se descontará de tu cuenta al finalizar tu visita.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {step !== 'date' && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Anterior
              </Button>
            )}
            {step !== 'confirm' ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 btn-hero"
              >
                Continuar
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 btn-hero"
              >
                {isSubmitting ? 'Confirmando...' : requiresDeposit ? `Pagar anticipo y confirmar` : 'Confirmar reserva'}
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Stripe Payment Modal */}
      <StripePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        amount={depositAmount || 0}
        restaurantName={restaurant.name}
        reservationData={{
          restaurantId: id!,
          date: dateStr,
          time: selectedTime || '',
          guestCount,
        }}
      />

      <Footer />
    </div>
  );
};

export default ReservationPage;
