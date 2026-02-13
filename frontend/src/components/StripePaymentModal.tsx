import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Lock, CheckCircle, Loader2, Calendar, Users, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface PaymentFormProps {
    amount: number;
    onSuccess: () => void;
    onCancel: () => void;
}

const PaymentForm = ({ amount, onSuccess, onCancel }: PaymentFormProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setError(null);

        const { error: submitError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/mis-reservas`,
            },
            redirect: 'if_required',
        });

        if (submitError) {
            setError(submitError.message || 'Error processing payment');
            setIsProcessing(false);
        } else {
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Payment element container */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-inner">
                <PaymentElement
                    options={{
                        layout: 'tabs',
                        defaultValues: {
                            billingDetails: {
                                address: {
                                    country: 'MX',
                                },
                            },
                        },
                    }}
                />
            </div>

            {/* Error message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium"
                    >
                        ⚠️ {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-6 py-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                    <span>SSL Seguro</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Protegido por Stripe</span>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="flex-1 h-12 rounded-xl border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Procesando...
                        </>
                    ) : (
                        <>
                            <CreditCard className="h-5 w-5 mr-2" />
                            Pagar ${amount} MXN
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};

interface StripePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    amount: number;
    restaurantName: string;
    reservationData: {
        restaurantId: string;
        date: string;
        time: string;
        guestCount: number;
    };
}

export const StripePaymentModal = ({
    isOpen,
    onClose,
    onSuccess,
    amount,
    restaurantName,
    reservationData,
}: StripePaymentModalProps) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Ensure minimum amount of $10 MXN (Stripe requirement)
    const finalAmount = Math.max(amount, 10);

    // Auto-create PaymentIntent when modal opens
    useEffect(() => {
        if (isOpen && !clientSecret && !isLoading) {
            createPaymentIntent();
        }
    }, [isOpen]);

    const createPaymentIntent = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Try user token first, then restaurant token
            let token = null;
            const userSession = localStorage.getItem('mesafeliz_session');
            const restaurantSession = localStorage.getItem('mesafeliz_restaurant_session');

            if (userSession) {
                token = JSON.parse(userSession).token;
            } else if (restaurantSession) {
                token = JSON.parse(restaurantSession).token;
            }

            const response = await fetch(`${API_BASE_URL}/payments/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify({
                    amount: finalAmount,
                    currency: 'mxn',
                    reservationData,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setClientSecret(data.clientSecret);
            } else {
                setError(data.error || 'Error al preparar el pago');
                console.error('Failed to create payment intent:', data.error);
            }
        } catch (error) {
            setError('Error de conexión. Intenta de nuevo.');
            console.error('Error creating payment intent:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccess = () => {
        setPaymentSuccess(true);
        setTimeout(() => {
            onSuccess();
        }, 2500);
    };

    // Reset state when modal closes
    const handleClose = () => {
        setClientSecret(null);
        setPaymentSuccess(false);
        setError(null);
        onClose();
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl bg-white dark:bg-slate-900">
                {/* Premium Header */}
                <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 py-5 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            Pago de Anticipo
                        </DialogTitle>
                        <DialogDescription className="text-emerald-100 mt-1">
                            Completa el pago para confirmar tu reservación
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {paymentSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="text-center py-8"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"
                                >
                                    <CheckCircle className="h-12 w-12 text-white" />
                                </motion.div>
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                        ¡Pago Exitoso!
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        Tu anticipo de <span className="font-semibold text-emerald-600">${finalAmount} MXN</span> ha sido procesado
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                                        <Sparkles className="h-4 w-4" />
                                        <span>Confirmando tu reservación...</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-5"
                            >
                                {/* Reservation Summary Card */}
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                Reservación en
                                            </p>
                                            <p className="font-bold text-lg text-slate-800 dark:text-slate-200">
                                                {restaurantName}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4 text-emerald-500" />
                                                    {formatDate(reservationData.date)} • {reservationData.time}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Users className="h-4 w-4 text-emerald-500" />
                                                    {reservationData.guestCount} personas
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                Total
                                            </p>
                                            <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                                ${finalAmount}
                                            </p>
                                            <p className="text-xs text-slate-400">MXN</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Form or Loading State */}
                                {error ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <span className="text-3xl">⚠️</span>
                                        </div>
                                        <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error}</p>
                                        <Button onClick={createPaymentIntent} variant="outline" className="rounded-xl">
                                            Reintentar
                                        </Button>
                                    </div>
                                ) : !clientSecret ? (
                                    <div className="py-12 text-center">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-emerald-200 border-t-emerald-600"
                                        />
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                                            Preparando método de pago...
                                        </p>
                                    </div>
                                ) : (
                                    <Elements
                                        stripe={stripePromise}
                                        options={{
                                            clientSecret,
                                            appearance: {
                                                theme: 'stripe',
                                                variables: {
                                                    colorPrimary: '#059669',
                                                    colorBackground: '#ffffff',
                                                    colorText: '#1e293b',
                                                    colorDanger: '#dc2626',
                                                    fontFamily: 'Inter, system-ui, sans-serif',
                                                    borderRadius: '12px',
                                                    spacingUnit: '4px',
                                                },
                                                rules: {
                                                    '.Input': {
                                                        border: '2px solid #e2e8f0',
                                                        boxShadow: 'none',
                                                        padding: '12px 14px',
                                                    },
                                                    '.Input:focus': {
                                                        border: '2px solid #059669',
                                                        boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.1)',
                                                    },
                                                    '.Label': {
                                                        fontWeight: '600',
                                                        fontSize: '13px',
                                                        marginBottom: '8px',
                                                    },
                                                    '.Tab': {
                                                        border: '2px solid #e2e8f0',
                                                        borderRadius: '10px',
                                                    },
                                                    '.Tab--selected': {
                                                        border: '2px solid #059669',
                                                        backgroundColor: '#ecfdf5',
                                                    },
                                                },
                                            },
                                        }}
                                    >
                                        <PaymentForm amount={finalAmount} onSuccess={handleSuccess} onCancel={handleClose} />
                                    </Elements>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StripePaymentModal;
