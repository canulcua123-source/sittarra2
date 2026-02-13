import { motion } from 'framer-motion';
import {
    MapPin, Clock, Phone, Mail, Globe, Instagram,
    Facebook, CreditCard, Car, Wifi, Music, Dog,
    UtensilsCrossed, Accessibility, Baby
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RestaurantInfoProps {
    restaurant: {
        address?: string;
        zone?: string;
        phone?: string;
        email?: string;
        website?: string;
        instagram?: string;
        facebook?: string;
        openingHours?: {
            [key: string]: { open: string; close: string } | null;
        };
        features?: string[];
        paymentMethods?: string[];
        cuisineType?: string;
        priceRange?: string;
    };
}

const dayNames: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
};

const featureIcons: Record<string, typeof Wifi> = {
    wifi: Wifi,
    parking: Car,
    'live-music': Music,
    'pet-friendly': Dog,
    'kids-menu': Baby,
    accessible: Accessibility,
    'outdoor-seating': UtensilsCrossed,
};

const featureLabels: Record<string, string> = {
    wifi: 'Wi-Fi Gratis',
    parking: 'Estacionamiento',
    'live-music': 'Música en Vivo',
    'pet-friendly': 'Pet Friendly',
    'kids-menu': 'Menú Infantil',
    accessible: 'Accesible',
    'outdoor-seating': 'Terraza',
};

const RestaurantInfo = ({ restaurant }: RestaurantInfoProps) => {
    const isOpenNow = () => {
        if (!restaurant.openingHours) return null;

        const now = new Date();
        const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
        const hours = restaurant.openingHours[dayKey];

        if (!hours) return false;

        const currentTime = now.getHours() * 100 + now.getMinutes();
        const openTime = parseInt(hours.open.replace(':', ''));
        const closeTime = parseInt(hours.close.replace(':', ''));

        return currentTime >= openTime && currentTime <= closeTime;
    };

    const openStatus = isOpenNow();

    return (
        <div className="space-y-6">
            {/* Location & Contact */}
            <div className="bg-card rounded-xl p-5 border border-border">
                <h3 className="font-display text-lg font-bold mb-4">Ubicación y Contacto</h3>

                <div className="space-y-3">
                    {restaurant.address && (
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="font-medium">{restaurant.address}</p>
                                {restaurant.zone && (
                                    <p className="text-sm text-muted-foreground">{restaurant.zone}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {restaurant.phone && (
                        <a
                            href={`tel:${restaurant.phone}`}
                            className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                            <Phone className="h-5 w-5 text-primary" />
                            <span>{restaurant.phone}</span>
                        </a>
                    )}

                    {restaurant.email && (
                        <a
                            href={`mailto:${restaurant.email}`}
                            className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                            <Mail className="h-5 w-5 text-primary" />
                            <span>{restaurant.email}</span>
                        </a>
                    )}

                    {restaurant.website && (
                        <a
                            href={restaurant.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                            <Globe className="h-5 w-5 text-primary" />
                            <span>Sitio web</span>
                        </a>
                    )}
                </div>

                {/* Social Links */}
                {(restaurant.instagram || restaurant.facebook) && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                        {restaurant.instagram && (
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={`https://instagram.com/${restaurant.instagram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Instagram className="h-4 w-4 mr-2" />
                                    Instagram
                                </a>
                            </Button>
                        )}
                        {restaurant.facebook && (
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={`https://facebook.com/${restaurant.facebook}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Facebook className="h-4 w-4 mr-2" />
                                    Facebook
                                </a>
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Opening Hours */}
            {restaurant.openingHours && (
                <div className="bg-card rounded-xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display text-lg font-bold">Horarios</h3>
                        {openStatus !== null && (
                            <Badge className={openStatus ? 'bg-green-500' : 'bg-red-500'}>
                                {openStatus ? 'Abierto ahora' : 'Cerrado'}
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-2">
                        {Object.entries(dayNames).map(([key, label]) => {
                            const hours = restaurant.openingHours?.[key];
                            const today = new Date().getDay();
                            const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(key);
                            const isToday = today === dayIndex;

                            return (
                                <div
                                    key={key}
                                    className={`flex justify-between py-2 px-3 rounded-lg ${isToday ? 'bg-primary/10' : ''
                                        }`}
                                >
                                    <span className={isToday ? 'font-semibold text-primary' : ''}>
                                        {label}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {hours ? `${hours.open} - ${hours.close}` : 'Cerrado'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Features */}
            {restaurant.features && restaurant.features.length > 0 && (
                <div className="bg-card rounded-xl p-5 border border-border">
                    <h3 className="font-display text-lg font-bold mb-4">Características</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {restaurant.features.map((feature) => {
                            const Icon = featureIcons[feature] || UtensilsCrossed;
                            const label = featureLabels[feature] || feature;

                            return (
                                <div key={feature} className="flex items-center gap-2 text-sm">
                                    <Icon className="h-4 w-4 text-primary" />
                                    <span>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Payment Methods */}
            {restaurant.paymentMethods && restaurant.paymentMethods.length > 0 && (
                <div className="bg-card rounded-xl p-5 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <h3 className="font-display text-lg font-bold">Métodos de Pago</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {restaurant.paymentMethods.map((method) => (
                            <Badge key={method} variant="outline">
                                {method}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantInfo;
