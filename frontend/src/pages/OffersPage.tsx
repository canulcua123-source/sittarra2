import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag, Clock, MapPin, Star, Percent, Gift, ArrowRight, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useOffers, useRestaurants } from '@/hooks/useData';

const OffersPage = () => {
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch data from API
    const { data: offers = [], isLoading: loadingOffers } = useOffers();
    const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants();

    const isLoading = loadingOffers || loadingRestaurants;

    // Combine offers with restaurant info
    const offersWithRestaurants = offers.map(offer => {
        const restaurant = restaurants.find(r => r.id === offer.restaurantId);
        return { ...offer, restaurant };
    }).filter(offer => offer.restaurant);

    // Filter based on search
    const filteredOffers = offersWithRestaurants.filter(offer =>
        offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate days remaining
    const getDaysRemaining = (validUntil: string) => {
        const today = new Date();
        const endDate = new Date(validUntil);
        const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="pt-28 pb-20">
                <div className="container mx-auto px-4">
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full mb-4">
                            <Sparkles className="w-4 h-4" />
                            <span className="font-medium">Ofertas exclusivas</span>
                        </div>
                        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                            Ofertas y <span className="text-primary">Promociones</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Descubre las mejores ofertas de los restaurantes más exclusivos de Mérida.
                            ¡Reserva ahora y aprovecha descuentos especiales!
                        </p>
                    </motion.div>

                    {/* Search */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="max-w-xl mx-auto mb-12"
                    >
                        <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar ofertas, restaurantes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 h-14 text-lg rounded-xl"
                            />
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-12"
                    >
                        <div className="bg-card rounded-xl p-4 text-center shadow-soft">
                            <p className="text-3xl font-bold text-primary">{offers.length}</p>
                            <p className="text-sm text-muted-foreground">Ofertas activas</p>
                        </div>
                        <div className="bg-card rounded-xl p-4 text-center shadow-soft">
                            <p className="text-3xl font-bold text-secondary">{restaurants.filter(r => r.hasOffers).length}</p>
                            <p className="text-sm text-muted-foreground">Restaurantes</p>
                        </div>
                        <div className="bg-card rounded-xl p-4 text-center shadow-soft">
                            <p className="text-3xl font-bold text-success">20%</p>
                            <p className="text-sm text-muted-foreground">Hasta de descuento</p>
                        </div>
                    </motion.div>

                    {/* Offers Grid */}
                    {filteredOffers.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredOffers.map((offer, index) => {
                                const daysRemaining = getDaysRemaining(offer.validUntil);
                                const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
                                const isExpired = daysRemaining <= 0;

                                return (
                                    <motion.div
                                        key={offer.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 * index }}
                                        className={`bg-card rounded-2xl overflow-hidden shadow-card border-2 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 ${isExpired ? 'opacity-60 border-muted' : 'border-transparent'
                                            }`}
                                    >
                                        {/* Restaurant Image */}
                                        <div className="relative h-48">
                                            <img
                                                src={offer.restaurant?.image}
                                                alt={offer.restaurant?.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                                            {/* Offer Badge */}
                                            <div className="absolute top-4 left-4">
                                                <Badge className="bg-secondary text-secondary-foreground px-3 py-1.5 text-sm font-bold">
                                                    <Percent className="w-4 h-4 mr-1" />
                                                    {offer.discount}
                                                </Badge>
                                            </div>

                                            {/* Expiry Badge */}
                                            {isExpiringSoon && !isExpired && (
                                                <div className="absolute top-4 right-4">
                                                    <Badge className="bg-warning text-warning-foreground px-2 py-1 text-xs">
                                                        ¡Últimos {daysRemaining} días!
                                                    </Badge>
                                                </div>
                                            )}
                                            {isExpired && (
                                                <div className="absolute top-4 right-4">
                                                    <Badge className="bg-destructive text-destructive-foreground px-2 py-1 text-xs">
                                                        Expirada
                                                    </Badge>
                                                </div>
                                            )}

                                            {/* Restaurant Info */}
                                            <div className="absolute bottom-4 left-4 right-4">
                                                <h3 className="text-white font-display font-bold text-lg mb-1">
                                                    {offer.restaurant?.name}
                                                </h3>
                                                <div className="flex items-center gap-3 text-white/80 text-sm">
                                                    <span className="flex items-center gap-1">
                                                        <Star className="w-4 h-4 fill-warning text-warning" />
                                                        {offer.restaurant?.rating}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {offer.restaurant?.zone}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Offer Details */}
                                        <div className="p-5">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Gift className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-lg">{offer.title}</h4>
                                                    <p className="text-muted-foreground text-sm">{offer.description}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>
                                                        {isExpired
                                                            ? 'Oferta expirada'
                                                            : `Válido hasta ${new Date(offer.validUntil).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
                                                        }
                                                    </span>
                                                </div>

                                                {!isExpired && (
                                                    <Link to={`/restaurante/${offer.restaurantId}`}>
                                                        <Button size="sm" className="gap-1">
                                                            Reservar
                                                            <ArrowRight className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                                <Tag className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="font-display text-xl font-semibold mb-2">No se encontraron ofertas</h3>
                            <p className="text-muted-foreground mb-6">
                                Intenta con otros términos de búsqueda
                            </p>
                            <Button onClick={() => setSearchQuery('')}>Ver todas las ofertas</Button>
                        </motion.div>
                    )}

                    {/* CTA Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-16 bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-primary-foreground text-center"
                    >
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-80" />
                        <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                            ¿Tienes un restaurante?
                        </h2>
                        <p className="opacity-90 mb-6 max-w-xl mx-auto">
                            © 2024 Sittara. Todos los derechos reservados. especiales a miles de comensales en Mérida.
                        </p>
                        <Link to="/admin/login">
                            <Button variant="secondary" size="lg" className="gap-2">
                                Registra tu restaurante
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default OffersPage;
