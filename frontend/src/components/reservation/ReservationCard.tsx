import { motion } from 'framer-motion';
import { Calendar, Clock, Users, MapPin, ChevronRight, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge, { ReservationStatus } from './StatusBadge';
import { Link } from 'react-router-dom';

export interface ReservationCardData {
    id: string;
    restaurantId: string;
    restaurantName: string;
    restaurantImage?: string;
    date: string;
    time: string;
    guestCount: number;
    tableNumber?: number;
    status: ReservationStatus;
    occasion?: string;
    canRate?: boolean;
}

interface ReservationCardProps {
    reservation: ReservationCardData;
    onCancel?: (id: string) => void;
    onRate?: (id: string) => void;
}

const ReservationCard = ({ reservation, onCancel, onRate }: ReservationCardProps) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const isPast = new Date(reservation.date) < new Date();
    const canCancel = ['pending', 'confirmed'].includes(reservation.status) && !isPast;
    const showRateButton = reservation.status === 'completed' && reservation.canRate;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
        >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                        {/* Restaurant Image */}
                        <div className="md:w-48 h-32 md:h-auto relative">
                            <img
                                src={reservation.restaurantImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
                                alt={reservation.restaurantName}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:bg-gradient-to-r" />
                            <div className="absolute bottom-2 left-2 md:bottom-auto md:top-2">
                                <StatusBadge status={reservation.status} size="sm" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-3">
                                    {/* Restaurant Name */}
                                    <Link
                                        to={`/restaurante/${reservation.restaurantId}`}
                                        className="text-lg font-display font-bold hover:text-primary transition-colors"
                                    >
                                        {reservation.restaurantName}
                                    </Link>

                                    {/* Date & Time */}
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatDate(reservation.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4" />
                                            <span>{reservation.time}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-4 w-4" />
                                            <span>{reservation.guestCount} personas</span>
                                        </div>
                                    </div>

                                    {/* Table & Occasion */}
                                    <div className="flex flex-wrap gap-3 text-sm">
                                        {reservation.tableNumber && (
                                            <span className="px-2 py-1 bg-muted rounded-md">
                                                Mesa {reservation.tableNumber}
                                            </span>
                                        )}
                                        {reservation.occasion && reservation.occasion !== 'none' && (
                                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-md capitalize">
                                                {reservation.occasion}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-row md:flex-col gap-2 mt-2 md:mt-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="flex-1 md:flex-none"
                                    >
                                        <Link to={`/restaurante/${reservation.restaurantId}`}>
                                            Ver restaurante
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Link>
                                    </Button>

                                    {showRateButton && onRate && (
                                        <Button
                                            size="sm"
                                            onClick={() => onRate(reservation.id)}
                                            className="flex-1 md:flex-none gap-1"
                                        >
                                            <Star className="h-4 w-4" />
                                            Calificar
                                        </Button>
                                    )}

                                    {canCancel && onCancel && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onCancel(reservation.id)}
                                            className="flex-1 md:flex-none text-destructive hover:text-destructive"
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default ReservationCard;
