import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, ThumbsUp, Filter, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/components/admin/AdminLayout';
import { useReviews, useDashboardMetrics } from '@/hooks/useData';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ReviewsPage = () => {
    const { restaurant } = useRestaurantAuth();
    const restaurantId = restaurant?.id;
    const [filter, setFilter] = useState('all');

    const { data: reviews = [], isLoading: isReviewsLoading } = useReviews(restaurantId);
    const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetrics(restaurantId);

    const renderStars = (rating: number) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <Star
                    key={star}
                    className={`w-3 h-3 ${star <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`}
                />
            ))}
        </div>
    );

    // Filter reviews
    const filteredReviews = reviews.filter(review => {
        if (filter === 'all') return true;
        if (filter === 'positive') return review.rating >= 4;
        if (filter === 'negative') return review.rating <= 3;
        if (filter === 'pending') return !review.response;
        return true;
    });

    // Calculate distribution
    const distribution = [5, 4, 3, 2, 1].map(star => {
        const count = reviews.filter(r => Math.round(r.rating) === star).length;
        const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
        return { stars: star, count, percentage };
    });

    if (isReviewsLoading || isMetricsLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2">Cargando opiniones...</span>
                </div>
            </AdminLayout>
        );
    }

    const averageRating = metrics?.averageRating || 0;
    const totalReviews = reviews.length;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Opiniones</h1>
                        <p className="text-muted-foreground">{totalReviews} opiniones de clientes</p>
                    </div>
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-48">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filtrar por..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="positive">Positivas (4-5⭐)</SelectItem>
                            <SelectItem value="negative">Negativas (1-3⭐)</SelectItem>
                            <SelectItem value="pending">Sin responder</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-card rounded-xl p-6 shadow-card text-center border">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <Award className="w-8 h-8 text-warning" />
                            <span className="text-5xl font-bold">{averageRating}</span>
                        </div>
                        <div className="flex justify-center mb-2">
                            {renderStars(Math.round(averageRating))}
                        </div>
                        <p className="text-muted-foreground text-sm">Rating promedio basado en {totalReviews} opiniones</p>
                    </div>
                    <div className="md:col-span-2 bg-card rounded-xl p-6 shadow-card border">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Distribución de calificaciones</h3>
                        <div className="space-y-3">
                            {distribution.map(item => (
                                <div key={item.stars} className="flex items-center gap-3">
                                    <span className="w-12 text-sm flex items-center gap-1 font-medium">{item.stars}<Star className="w-3 h-3 fill-warning text-warning" /></span>
                                    <Progress value={item.percentage} className="flex-1 h-2" />
                                    <span className="w-8 text-xs text-right text-muted-foreground">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-card overflow-hidden border">
                    <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                        <h3 className="font-semibold">Reseñas de Clientes</h3>
                        <Badge variant="outline">{reviews.filter(r => !r.response).length} sin responder</Badge>
                    </div>
                    <div className="divide-y">
                        {filteredReviews.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No se encontraron opiniones con este filtro.</p>
                            </div>
                        ) : (
                            filteredReviews.map((review, index) => (
                                <motion.div
                                    key={review.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-6 hover:bg-muted/10 transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {review.customerName?.charAt(0) || 'C'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{review.customerName || 'Cliente anónimo'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {review.createdAt ? format(new Date(review.createdAt), 'PPP', { locale: es }) : 'Reciente'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {renderStars(review.rating)}
                                            <Badge className={review.response ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'} variant="outline">
                                                {review.response ? 'Respondida' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed">"{review.comment}"</p>

                                    {review.response && (
                                        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                                            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Tu respuesta:</p>
                                            <p className="text-sm italic">"{review.response}"</p>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-4">
                                        {!review.response && (
                                            <Button size="sm" variant="outline" className="h-8 gap-2">
                                                <MessageSquare className="w-4 h-4" />
                                                Responder
                                            </Button>
                                        )}
                                        {/* Simplified helpful toggle or counter if implemented in API */}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default ReviewsPage;
