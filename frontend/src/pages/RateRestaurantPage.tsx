import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, ChevronLeft, Smile, Check, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRestaurant } from '@/hooks/useData';
import { cn } from '@/lib/utils';

// Aspectos a calificar
const ratingAspects = [
    { id: 'food', label: 'Comida', emoji: '🍽️' },
    { id: 'service', label: 'Servicio', emoji: '🙋' },
    { id: 'ambiance', label: 'Ambiente', emoji: '✨' },
    { id: 'value', label: 'Relación precio-calidad', emoji: '💰' },
];

// Quick tags para reviews
const quickTags = [
    'Comida deliciosa',
    'Excelente servicio',
    'Ambiente acogedor',
    'Buena relación calidad-precio',
    'Perfecto para parejas',
    'Ideal para familias',
    'Recomendado',
    'Volveré pronto',
];

const RateRestaurantPage = () => {
    const { id, reservationId } = useParams();
    const navigate = useNavigate();
    const { data: restaurant, isLoading } = useRestaurant(id);

    const [step, setStep] = useState(1);
    const [overallRating, setOverallRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({});
    const [comment, setComment] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);

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

    const handleAspectRating = (aspectId: string, rating: number) => {
        setAspectRatings(prev => ({ ...prev, [aspectId]: rating }));
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleSubmit = () => {
        // Here would submit to backend
        setIsSubmitted(true);
        setTimeout(() => {
            navigate('/mis-reservas');
        }, 3000);
    };

    const canProceed = () => {
        if (step === 1) return overallRating > 0;
        if (step === 2) return Object.keys(aspectRatings).length === ratingAspects.length;
        return true;
    };

    const progress = (step / 3) * 100;

    // Submitted Success View
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="pt-20 pb-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center px-4"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="w-24 h-24 bg-success rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <Check className="w-12 h-12 text-white" />
                        </motion.div>
                        <h1 className="text-3xl font-display font-bold mb-4">¡Gracias por tu opinión!</h1>
                        <p className="text-muted-foreground text-lg mb-8">
                            Tu reseña ayuda a otros comensales a descubrir {restaurant.name}
                        </p>
                        <div className="flex gap-2 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={cn(
                                        'w-8 h-8',
                                        star <= overallRating
                                            ? 'fill-warning text-warning'
                                            : 'text-muted-foreground'
                                    )}
                                />
                            ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-8">
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
                {/* Progress Bar */}
                <div className="sticky top-16 bg-background/95 backdrop-blur z-10 border-b">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center gap-4 mb-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {step > 1 ? 'Anterior' : 'Salir'}
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Paso {step} de 3
                            </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                </div>

                {/* Restaurant Header */}
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4 mb-8">
                        <img
                            src={restaurant.image}
                            alt={restaurant.name}
                            className="w-16 h-16 rounded-xl object-cover"
                        />
                        <div>
                            <h2 className="font-display font-semibold">{restaurant.name}</h2>
                            <p className="text-sm text-muted-foreground">Califica tu experiencia</p>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* Step 1: Overall Rating */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="max-w-lg mx-auto text-center"
                            >
                                <h1 className="text-2xl font-display font-bold mb-4">
                                    ¿Cómo fue tu experiencia general?
                                </h1>
                                <p className="text-muted-foreground mb-8">
                                    Selecciona una calificación de 1 a 5 estrellas
                                </p>

                                <div className="flex justify-center gap-4 mb-8">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <motion.button
                                            key={star}
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setOverallRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            className="p-2"
                                        >
                                            <Star
                                                className={cn(
                                                    'w-12 h-12 transition-colors',
                                                    star <= (hoverRating || overallRating)
                                                        ? 'fill-warning text-warning'
                                                        : 'text-muted-foreground/30'
                                                )}
                                            />
                                        </motion.button>
                                    ))}
                                </div>

                                {overallRating > 0 && (
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-lg font-medium"
                                    >
                                        {overallRating === 1 && '😞 Muy malo'}
                                        {overallRating === 2 && '😕 Regular'}
                                        {overallRating === 3 && '😊 Bueno'}
                                        {overallRating === 4 && '😄 Muy bueno'}
                                        {overallRating === 5 && '🤩 Excelente'}
                                    </motion.p>
                                )}

                                <Button
                                    onClick={() => setStep(2)}
                                    disabled={!canProceed()}
                                    className="mt-8 px-8"
                                    size="lg"
                                >
                                    Continuar
                                </Button>
                            </motion.div>
                        )}

                        {/* Step 2: Aspect Ratings */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="max-w-lg mx-auto"
                            >
                                <h1 className="text-2xl font-display font-bold mb-4 text-center">
                                    Califica cada aspecto
                                </h1>
                                <p className="text-muted-foreground mb-8 text-center">
                                    Ayuda a otros a conocer los detalles
                                </p>

                                <div className="space-y-6">
                                    {ratingAspects.map((aspect) => (
                                        <div key={aspect.id} className="bg-card rounded-xl p-4 shadow-card">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="flex items-center gap-2 font-medium">
                                                    <span className="text-xl">{aspect.emoji}</span>
                                                    {aspect.label}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {aspectRatings[aspect.id] || 0}/5
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => handleAspectRating(aspect.id, star)}
                                                        className="flex-1 p-2 rounded-lg transition-colors hover:bg-muted"
                                                    >
                                                        <Star
                                                            className={cn(
                                                                'w-6 h-6 mx-auto',
                                                                star <= (aspectRatings[aspect.id] || 0)
                                                                    ? 'fill-warning text-warning'
                                                                    : 'text-muted-foreground/30'
                                                            )}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={() => setStep(3)}
                                    disabled={!canProceed()}
                                    className="mt-8 w-full"
                                    size="lg"
                                >
                                    Continuar
                                </Button>
                            </motion.div>
                        )}

                        {/* Step 3: Comment and Tags */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="max-w-lg mx-auto"
                            >
                                <h1 className="text-2xl font-display font-bold mb-4 text-center">
                                    Cuéntanos más
                                </h1>
                                <p className="text-muted-foreground mb-8 text-center">
                                    Tu opinión ayuda a la comunidad
                                </p>

                                {/* Quick Tags */}
                                <div className="mb-6">
                                    <label className="text-sm font-medium mb-3 block">
                                        Selecciona etiquetas (opcional)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {quickTags.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-full text-sm transition-all',
                                                    selectedTags.includes(tag)
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                )}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Comment */}
                                <div className="mb-6">
                                    <label className="text-sm font-medium mb-3 block">
                                        Escribe tu reseña (opcional)
                                    </label>
                                    <Textarea
                                        placeholder="Cuéntanos sobre tu experiencia: ¿qué te gustó? ¿qué platillos probaste? ¿cómo fue el servicio?"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="min-h-[150px] bg-card"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {comment.length}/500 caracteres
                                    </p>
                                </div>

                                {/* Photos */}
                                <div className="mb-8">
                                    <label className="text-sm font-medium mb-3 block">
                                        Agrega fotos (opcional)
                                    </label>
                                    <div className="flex gap-3">
                                        <button className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors">
                                            <Camera className="w-6 h-6 text-muted-foreground" />
                                        </button>
                                        {photos.map((photo, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={photo}
                                                    alt={`Foto ${index + 1}`}
                                                    className="w-20 h-20 rounded-xl object-cover"
                                                />
                                                <button
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"
                                                    onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                                                >
                                                    <X className="w-4 h-4 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    className="w-full gap-2"
                                    size="lg"
                                >
                                    <Send className="w-5 h-5" />
                                    Publicar reseña
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default RateRestaurantPage;
