import { motion } from 'framer-motion';
import { Star, MessageCircle, ThumbsUp, Calendar, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Review {
    id: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    foodRating?: number;
    serviceRating?: number;
    ambianceRating?: number;
    valueRating?: number;
    comment?: string;
    tags?: string[];
    createdAt: string;
    response?: string;
    respondedAt?: string;
}

interface ReviewsListProps {
    reviews: Review[];
    isLoading?: boolean;
    showStats?: boolean;
    averageRating?: number;
    totalReviews?: number;
}

const StarRating = ({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) => {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5'
    };

    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={cn(
                        sizes[size],
                        star <= value
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-transparent text-gray-300'
                    )}
                />
            ))}
        </div>
    );
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ReviewsList = ({
    reviews,
    isLoading = false,
    showStats = true,
    averageRating,
    totalReviews
}: ReviewsListProps) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-muted/50 rounded-xl p-6 h-40" />
                ))}
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aún no hay opiniones</p>
                <p className="text-sm text-muted-foreground mt-1">
                    ¡Sé el primero en compartir tu experiencia!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            {showStats && averageRating !== undefined && (
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{averageRating.toFixed(1)}</div>
                        <StarRating value={Math.round(averageRating)} size="md" />
                        <div className="text-sm text-muted-foreground mt-1">
                            {totalReviews || reviews.length} opiniones
                        </div>
                    </div>
                </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.map((review, index) => (
                    <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-card border border-border rounded-xl p-5"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={review.userAvatar} />
                                    <AvatarFallback>
                                        {(review.userName || (review as any).customerName || (review as any).user?.name || 'C').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">
                                        {review.userName || (review as any).customerName || (review as any).user?.name || 'Cliente'}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(review.createdAt)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <StarRating value={review.rating} />
                                <Badge variant="outline" className="font-semibold">
                                    {review.rating.toFixed(1)}
                                </Badge>
                            </div>
                        </div>

                        {/* Category Ratings */}
                        {(review.foodRating || review.serviceRating || review.ambianceRating || review.valueRating) && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                                {review.foodRating && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Comida:</span>
                                        <span className="font-medium">{review.foodRating}</span>
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    </div>
                                )}
                                {review.serviceRating && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Servicio:</span>
                                        <span className="font-medium">{review.serviceRating}</span>
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    </div>
                                )}
                                {review.ambianceRating && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Ambiente:</span>
                                        <span className="font-medium">{review.ambianceRating}</span>
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    </div>
                                )}
                                {review.valueRating && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Precio:</span>
                                        <span className="font-medium">{review.valueRating}</span>
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comment */}
                        {review.comment && (
                            <p className="text-foreground leading-relaxed mb-3">
                                {review.comment}
                            </p>
                        )}

                        {/* Tags */}
                        {review.tags && review.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {review.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Restaurant Response */}
                        {review.response && (
                            <div className="mt-4 pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                                    <MessageCircle className="h-4 w-4" />
                                    Respuesta del restaurante
                                </div>
                                <p className="text-sm text-foreground">{review.response}</p>
                                {review.respondedAt && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {formatDate(review.respondedAt)}
                                    </p>
                                )}
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ReviewsList;
