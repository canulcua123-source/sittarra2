import { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CreditCard, Calendar, Clock, Users, MapPin, Shield,
    ChevronLeft, Lock, Check, AlertCircle, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRestaurant } from '@/hooks/useData';
import { cn } from '@/lib/utils';

const paymentMethods = [
    { id: 'card', name: 'Tarjeta de crédito/débito', icon: CreditCard },
    { id: 'paypal', name: 'PayPal', icon: Wallet },
];

const PaymentPage = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { data: restaurant, isLoading } = useRestaurant(id);

    const depositAmount = parseInt(searchParams.get('amount') || '200');
    const date = searchParams.get('date') || '';
    const time = searchParams.get('time') || '';
    const guests = parseInt(searchParams.get('guests') || '2');
    const mesa = searchParams.get('mesa') || '';

    const [paymentMethod, setPaymentMethod] = useState('card');
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardName, setCardName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!restaurant) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-display font-bold mb-4">Restaurante no encontrado</h1>
                    <Button asChild>
                        <Link to="/">Volver al inicio</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : value;
    };

    const formatExpiryDate = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate success (in real app, would call payment API)
        const success = Math.random() > 0.1; // 90% success rate for demo

        if (success) {
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/mis-reservas');
            }, 3000);
        } else {
            setError('Hubo un problema procesando tu pago. Por favor intenta de nuevo.');
            setIsProcessing(false);
        }
    };

    const isValidForm = () => {
        if (paymentMethod === 'card') {
            return cardNumber.replace(/\s/g, '').length === 16 &&
                expiryDate.length === 5 &&
                cvv.length >= 3 &&
                cardName.length > 0;
        }
        return true;
    };

    // Success View
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="pt-20 pb-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center px-4 max-w-md"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="w-24 h-24 bg-success rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <Check className="w-12 h-12 text-white" />
                        </motion.div>
                        <h1 className="text-3xl font-display font-bold mb-4">¡Pago exitoso!</h1>
                        <p className="text-muted-foreground text-lg mb-6">
                            Tu anticipo de <span className="font-semibold text-foreground">${depositAmount} MXN</span> ha sido procesado correctamente.
                        </p>
                        <div className="bg-card rounded-xl p-4 shadow-card mb-8">
                            <h3 className="font-semibold mb-2">{restaurant.name}</h3>
                            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {date}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {time}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {guests} personas
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Redirigiendo a tus reservaciones...
                        </p>
                    </motion.div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="pt-20 pb-16">
                <div className="container mx-auto px-4 py-8">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-6 gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Volver a la reserva
                    </Button>

                    <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* Payment Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <div className="bg-card rounded-2xl p-6 shadow-card">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Lock className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-display font-bold">Pago de Anticipo</h1>
                                        <p className="text-muted-foreground">Transacción segura con encriptación SSL</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Payment Method Selection */}
                                    <div>
                                        <Label className="mb-3 block">Método de pago</Label>
                                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <div className="grid gap-3">
                                                {paymentMethods.map((method) => (
                                                    <label
                                                        key={method.id}
                                                        className={cn(
                                                            'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                                                            paymentMethod === method.id
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-muted hover:border-muted-foreground/30'
                                                        )}
                                                    >
                                                        <RadioGroupItem value={method.id} />
                                                        <method.icon className="w-6 h-6 text-muted-foreground" />
                                                        <span className="font-medium">{method.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {paymentMethod === 'card' && (
                                        <>
                                            <Separator />

                                            {/* Card Number */}
                                            <div className="space-y-2">
                                                <Label htmlFor="cardNumber">Número de tarjeta</Label>
                                                <div className="relative">
                                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                                    <Input
                                                        id="cardNumber"
                                                        placeholder="1234 5678 9012 3456"
                                                        value={cardNumber}
                                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                                        maxLength={19}
                                                        className="pl-10"
                                                    />
                                                </div>
                                            </div>

                                            {/* Expiry and CVV */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="expiry">Fecha de expiración</Label>
                                                    <Input
                                                        id="expiry"
                                                        placeholder="MM/AA"
                                                        value={expiryDate}
                                                        onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                                                        maxLength={5}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="cvv">CVV</Label>
                                                    <Input
                                                        id="cvv"
                                                        placeholder="123"
                                                        type="password"
                                                        value={cvv}
                                                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                        maxLength={4}
                                                    />
                                                </div>
                                            </div>

                                            {/* Card Name */}
                                            <div className="space-y-2">
                                                <Label htmlFor="cardName">Nombre en la tarjeta</Label>
                                                <Input
                                                    id="cardName"
                                                    placeholder="JUAN PÉREZ"
                                                    value={cardName}
                                                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {error && (
                                        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                                            <AlertCircle className="w-5 h-5" />
                                            <span className="text-sm">{error}</span>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={!isValidForm() || isProcessing}
                                        className="w-full gap-2"
                                        size="lg"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-5 h-5" />
                                                Pagar ${depositAmount} MXN
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>

                            {/* Security Info */}
                            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    <span>SSL Seguro</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    <span>Encriptado</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Order Summary */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="bg-card rounded-2xl p-6 shadow-card sticky top-24">
                                <h2 className="text-xl font-display font-semibold mb-6">Resumen de la Reserva</h2>

                                {/* Restaurant Info */}
                                <div className="flex gap-4 mb-6">
                                    <img
                                        src={restaurant.image}
                                        alt={restaurant.name}
                                        className="w-24 h-24 rounded-xl object-cover"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {restaurant.address}
                                        </p>
                                    </div>
                                </div>

                                <Separator className="mb-6" />

                                {/* Reservation Details */}
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            Fecha
                                        </span>
                                        <span className="font-medium">{date}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                            Hora
                                        </span>
                                        <span className="font-medium">{time}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Users className="w-4 h-4" />
                                            Personas
                                        </span>
                                        <span className="font-medium">{guests}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Mesa</span>
                                        <span className="font-medium">#{mesa}</span>
                                    </div>
                                </div>

                                <Separator className="mb-6" />

                                {/* Price Breakdown */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-lg">
                                        <span>Anticipo requerido</span>
                                        <span className="font-bold text-primary">${depositAmount} MXN</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Este monto será descontado de tu cuenta final el día de tu visita.
                                    </p>
                                </div>

                                {/* Policies */}
                                <div className="mt-6 p-4 rounded-xl bg-warning/10 border border-warning/20">
                                    <h4 className="font-semibold text-warning mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Políticas de cancelación
                                    </h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>• Cancelación gratuita hasta 24 horas antes</li>
                                        <li>• Cancelación después de 24 horas: sin reembolso</li>
                                        <li>• No presentarse: sin reembolso</li>
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PaymentPage;
