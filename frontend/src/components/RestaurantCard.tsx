import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, Tag, Heart, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Restaurant {
  id: string;
  name: string;
  image: string;
  cuisine: string;
  rating: number;
  reviewCount?: number;
  priceRange: string;
  zone: string;
  address?: string;
  isOpen?: boolean;
  openHours?: string;
  hasOffers?: boolean;
  offerTitle?: string;
  distance?: string;
  availableTables?: number;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  featured?: boolean;
}

const RestaurantCard = ({
  restaurant,
  isFavorite = false,
  onToggleFavorite,
  featured = false
}: RestaurantCardProps) => {
  const {
    id,
    name,
    image,
    cuisine,
    rating,
    reviewCount,
    priceRange,
    zone,
    isOpen,
    openHours,
    hasOffers,
    offerTitle,
    availableTables
  } = restaurant;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-xl transition-all duration-300",
        featured && "md:col-span-2 md:row-span-2"
      )}
    >
      {/* Image Container */}
      <div className={cn(
        "relative overflow-hidden",
        featured ? "h-80" : "h-48"
      )}>
        <img
          src={image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'}
          alt={name}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {hasOffers && (
            <Badge className="bg-accent text-accent-foreground animate-pulse">
              <Tag className="h-3 w-3 mr-1" />
              {offerTitle || 'Oferta'}
            </Badge>
          )}
          {isOpen !== undefined && (
            <Badge className={isOpen ? 'bg-green-500' : 'bg-gray-500'}>
              <Clock className="h-3 w-3 mr-1" />
              {isOpen ? 'Abierto' : 'Cerrado'}
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(id);
            }}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-110"
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
              )}
            />
          </button>
        )}

        {/* Restaurant Name on Image */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className={cn(
            "font-display font-bold text-white",
            featured ? "text-2xl" : "text-lg"
          )}>
            {name}
          </h3>
          <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{zone}</span>
            <span>•</span>
            <span>{cuisine}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Rating & Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span className="font-semibold text-yellow-700">{rating?.toFixed(1) || 'N/A'}</span>
            </div>
            {reviewCount !== undefined && (
              <span className="text-sm text-muted-foreground">({reviewCount} opiniones)</span>
            )}
          </div>
          <span className="text-lg font-semibold text-primary">{priceRange}</span>
        </div>

        {/* Availability */}
        {availableTables !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Users className="h-4 w-4" />
            <span>
              {availableTables > 0
                ? `${availableTables} mesas disponibles`
                : 'Sin mesas disponibles'}
            </span>
          </div>
        )}

        {/* Hours */}
        {openHours && (
          <p className="text-sm text-muted-foreground mb-3">
            🕐 {openHours}
          </p>
        )}

        {/* Action Button */}
        <Link to={`/restaurante/${id}`} className="block">
          <Button className="w-full group/btn">
            Ver restaurante
            <ChevronRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};

export default RestaurantCard;
