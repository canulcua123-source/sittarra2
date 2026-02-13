import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, MapPin, Calendar, ChevronRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import FeaturedSection from '@/components/FeaturedSection';
import RestaurantCard from '@/components/RestaurantCard';
import { useFeaturedRestaurants, useOffers, useRestaurants } from '@/hooks/useData';

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: featuredRestaurants = [], isLoading: loadingFeatured } = useFeaturedRestaurants();
  const { data: allRestaurants = [], isLoading: loadingAll } = useRestaurants();
  const { data: allOffers = [], isLoading: loadingOffers } = useOffers();

  // Filter restaurants with offers
  const restaurantsWithOffers = allRestaurants.filter(r =>
    allOffers.some(o => o.restaurantId === r.id)
  ).slice(0, 6);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    navigate(`/restaurantes?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section - New Premium Version */}
      <HeroSection onSearch={handleSearch} />

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              ¿Por qué elegir Sittara?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              La plataforma más completa para descubrir y reservar en los mejores restaurantes de Mérida
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Utensils,
                title: 'Restaurantes Exclusivos',
                description: 'Los mejores restaurantes de Mérida, cuidadosamente seleccionados para ofrecerte experiencias gastronómicas únicas.',
                gradient: 'from-amber-500 to-orange-500',
              },
              {
                icon: MapPin,
                title: 'Selección Visual de Mesas',
                description: 'Elige tu mesa favorita en el mapa interactivo del restaurante. Ve exactamente dónde estarás sentado.',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                icon: Calendar,
                title: 'Reserva Instantánea',
                description: 'Confirma tu reserva en segundos. Recibe tu código QR y disfruta sin preocupaciones.',
                gradient: 'from-green-500 to-emerald-500',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative group"
              >
                <div className="bg-background rounded-2xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                  <div className={`w-14 h-14 mb-6 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Restaurants - Using New Component */}
      <FeaturedSection
        restaurants={featuredRestaurants}
        type="featured"
        title="Destacados de la Semana"
        subtitle="Los restaurantes más populares y mejor calificados de Mérida"
        isLoading={loadingFeatured}
      />

      {/* Restaurants with Offers */}
      {restaurantsWithOffers.length > 0 && (
        <FeaturedSection
          restaurants={restaurantsWithOffers}
          type="offers"
          title="Con Ofertas Especiales"
          subtitle="Aprovecha las mejores promociones del momento"
          isLoading={loadingOffers}
        />
      )}

      {/* Offers Section */}
      <section className="py-20 bg-gradient-to-br from-accent to-accent/80">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-10"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-5 w-5 text-secondary" />
                <span className="text-secondary font-semibold">Ofertas Especiales</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Promociones Activas
              </h2>
            </div>
            <Link to="/ofertas" className="mt-4 md:mt-0">
              <Button variant="outline">
                Ver todas
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {allOffers.slice(0, 3).map((offer, index) => {
              const restaurant = allRestaurants.find(r => r.id === offer.restaurantId);
              return (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-2xl overflow-hidden shadow-card group hover:shadow-xl transition-shadow"
                >
                  {restaurant && (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={restaurant.image}
                        alt={restaurant.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-bold">
                          {offer.discount}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-display text-lg font-semibold mb-1">{offer.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{offer.description}</p>
                    {restaurant && (
                      <p className="text-sm text-muted-foreground">
                        En <span className="text-foreground font-medium">{restaurant.name}</span>
                      </p>
                    )}
                    <Link to={`/restaurante/${offer.restaurantId}`}>
                      <Button variant="outline" size="sm" className="mt-4 w-full">
                        Ver restaurante
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
          >
            {/* Pattern Background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }} />
            </div>

            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                ¿Tienes un restaurante?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Únete a Sittara y llega a miles de comensales. Gestiona tus reservas, mesas y ofertas desde un solo lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/registro-restaurante">
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    Registrar mi restaurante
                  </Button>
                </Link>
                <Link to="/admin/login">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white/30 text-white hover:bg-white/20">
                    Ya tengo cuenta
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
