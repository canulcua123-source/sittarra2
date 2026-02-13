import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, Utensils, Users, Sparkles, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: RatingData) => void;
    restaurantName: string;
    reservationDate: string;
    reservationId?: string;
    restaurantId?: string;
    isSubmitting?: boolean;
}

export interface RatingData {
    overallRating: number;
    foodRating: number;
    serviceRating: number;
    ambianceRating: number;
    valueRating: number;
    comment: string;
    tags: string[];
}

const ratingCategories = [
    { key: 'foodRating', label: 'Comida', icon: Utensils },
    { key: 'serviceRating', label: 'Servicio', icon: Users },
    { key: 'ambianceRating', label: 'Ambiente', icon: Sparkles },
    { key: 'valueRating', label: 'Relación Precio/Calidad', icon: DollarSign },
];

const predefinedTags = [
    'Romántico', 'Familiar', 'Buena música', 'Vista bonita',
    'Porciones generosas', 'Rápido', 'Recomendado', 'Precio justo',
    'Limpio', 'Sin ruido', 'Pet friendly', 'Ideal para grupos'
];

const StarRating = ({
    value,
    onChange,
    size = 'md'
}: {
    value: number;
    onChange: (rating: number) => void;
    size?: 'sm' | 'md' | 'lg';
}) => {
    const [hovered, setHovered] = useState<number | null>(null);

    const sizes = {
        sm: 'h-5 w-5',
        md: 'h-8 w-8',
        lg: 'h-10 w-10'
    };

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                    key={star}
                    type="button"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onChange(star)}
                    className="focus:outline-none"
                >
                    <Star
                        className={`${sizes[size]} transition-colors ${(hovered !== null ? star <= hovered : star <= value)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-transparent text-gray-300'
                            }`}
                    />
                </motion.button>
            ))}
        </div>
    );
};

const RatingModal = ({
    isOpen,
    onClose,
    onSubmit,
    restaurantName,
    reservationDate,
    reservationId,
    restaurantId,
    isSubmitting = false
}: RatingModalProps) => {
    const [ratings, setRatings] = useState<RatingData>({
        overallRating: 0,
        foodRating: 0,
        serviceRating: 0,
        ambianceRating: 0,
        valueRating: 0,
        comment: '',
        tags: []
    });

    const handleTagToggle = (tag: string) => {
        setRatings(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    };

    const handleSubmit = () => {
        if (ratings.overallRating === 0) return;
        onSubmit(ratings);
    };

    const isValid = ratings.overallRating > 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-display">
                        ¿Cómo estuvo tu visita?
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {restaurantName} • {reservationDate}
                    </p>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Overall Rating */}
                    <div className="text-center space-y-3">
                        <Label className="text-lg font-semibold">Calificación General</Label>
                        <div className="flex justify-center">
                            <StarRating
                                value={ratings.overallRating}
                                onChange={(v) => setRatings(prev => ({ ...prev, overallRating: v }))}
                                size="lg"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {ratings.overallRating === 0 && 'Toca las estrellas para calificar'}
                            {ratings.overallRating === 1 && 'Muy malo'}
                            {ratings.overallRating === 2 && 'Malo'}
                            {ratings.overallRating === 3 && 'Regular'}
                            {ratings.overallRating === 4 && 'Bueno'}
                            {ratings.overallRating === 5 && '¡Excelente!'}
                        </p>
                    </div>

                    {/* Category Ratings */}
                    <div className="grid grid-cols-2 gap-4">
                        {ratingCategories.map(({ key, label, icon: Icon }) => (
                            <div key={key} className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <span>{label}</span>
                                </div>
                                <StarRating
                                    value={ratings[key as keyof RatingData] as number}
                                    onChange={(v) => setRatings(prev => ({ ...prev, [key]: v }))}
                                    size="sm"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Tags */}
                    <div className="space-y-3">
                        <Label>Etiquetas (opcional)</Label>
                        <div className="flex flex-wrap gap-2">
                            {predefinedTags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant={ratings.tags.includes(tag) ? 'default' : 'outline'}
                                    className="cursor-pointer transition-all"
                                    onClick={() => handleTagToggle(tag)}
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-3">
                        <Label htmlFor="comment">Cuéntanos más (opcional)</Label>
                        <Textarea
                            id="comment"
                            placeholder="¿Qué te gustó? ¿Qué se puede mejorar?"
                            value={ratings.comment}
                            onChange={(e) => setRatings(prev => ({ ...prev, comment: e.target.value }))}
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
                        Más tarde
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                        className="flex-1 gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Enviar Opinión
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RatingModal;
