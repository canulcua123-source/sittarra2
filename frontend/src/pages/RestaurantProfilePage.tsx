import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, Heart, Users, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PhotoGallery from '@/components/restaurant/PhotoGallery';
import RestaurantInfo from '@/components/restaurant/RestaurantInfo';
import OffersSection from '@/components/restaurant/OffersSection';
import ReviewsList from '@/components/restaurant/ReviewsList';
import { useRestaurant, useMenu, useRestaurantOffers, useReviews } from '@/hooks/useData';
import { favoriteService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const RestaurantProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { data: restaurant, isLoading } = useRestaurant(id);
  const { data: menuItems = [] } = useMenu(id);
  const { data: restaurantOffers = [] } = useRestaurantOffers(id);
  const { data: reviews = [] } = useReviews(id); // Fetch real reviews from API
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  // Check if restaurant is in favorites when component mounts
  useEffect(() => {
    const checkFavorite = async () => {
      if (id && isAuthenticated) {
        const isFav = await favoriteService.check(id);
        setIsFavorite(isFav);
      }
    };
    checkFavorite();
  }, [id, isAuthenticated]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Inicia sesión',
        description: 'Debes iniciar sesión para guardar favoritos',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (!id || isFavoriteLoading) return;

    setIsFavoriteLoading(true);
    try {
      if (isFavorite) {
        const result = await favoriteService.remove(id);
        if (result.success) {
          setIsFavorite(false);
          toast({
            title: 'Eliminado de favoritos',
            description: 'El restaurante se eliminó de tus favoritos',
          });
        } else {
          toast({
            title: 'Error',
            description: result.error || 'No se pudo eliminar de favoritos',
            variant: 'destructive',
          });
        }
      } else {
        const result = await favoriteService.add(id);
        if (result.success) {
          setIsFavorite(true);
          toast({
            title: '¡Agregado a favoritos!',
            description: result.message || 'El restaurante se guardó en tus favoritos',
          });
        } else {
          toast({
            title: 'Error',
            description: result.error || 'No se pudo agregar a favoritos',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-28 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Restaurante no encontrado</h1>
          <Link to="/restaurantes">
            <Button>Volver a restaurantes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const menuCategories = [...new Set(menuItems.map(item => item.category))];

  // Build photos array
  const photos = restaurant.image
    ? [restaurant.image, ...(restaurant.photos || [])]
    : [];

  // Transform offers for the component
  const offersForSection = restaurantOffers.map(offer => ({
    id: offer.id,
    title: offer.title,
    description: offer.description,
    discount: offer.discount,
    validDays: offer.validDays,
    validHours: offer.validHours,
    validUntil: offer.validUntil,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section with Gallery */}
      <section className="pt-20">
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="h-5 w-5" />
            Volver
          </button>

          {/* Photo Gallery */}
          <PhotoGallery
            photos={photos}
            restaurantName={restaurant.name}
          />
        </div>
      </section>

      {/* Restaurant Header */}
      <section className="py-6 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              {restaurant.hasOffers && (
                <Badge className="bg-accent text-accent-foreground mb-2">
                  🔥 Oferta Activa
                </Badge>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                {restaurant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 bg-yellow-100 px-3 py-1 rounded-full">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-semibold text-yellow-700">{restaurant.rating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-yellow-600">({restaurant.reviewCount || 0} reseñas)</span>
                </div>
                <Badge variant="secondary">{restaurant.cuisine}</Badge>
                <Badge variant="outline">{restaurant.priceRange}</Badge>
                <Badge variant="outline">{restaurant.zone}</Badge>
                {restaurant.isOpen !== undefined && (
                  <Badge className={restaurant.isOpen ? 'bg-green-500' : 'bg-gray-500'}>
                    <Clock className="h-3 w-3 mr-1" />
                    {restaurant.isOpen ? 'Abierto' : 'Cerrado'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              disabled={isFavoriteLoading}
              className={`p-3 rounded-full border border-border hover:bg-muted transition-colors ${isFavoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart className={`h-6 w-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full justify-start mb-6 bg-muted p-1 rounded-xl overflow-x-auto">
                  <TabsTrigger value="info" className="rounded-lg">Información</TabsTrigger>
                  <TabsTrigger value="menu" className="rounded-lg">Menú</TabsTrigger>
                  <TabsTrigger value="offers" className="rounded-lg">Ofertas</TabsTrigger>
                  <TabsTrigger value="reviews" className="rounded-lg">Opiniones</TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Description */}
                    <div className="bg-card rounded-2xl p-6 shadow-card">
                      <h2 className="font-display text-xl font-semibold mb-4">Acerca del restaurante</h2>
                      <p className="text-muted-foreground leading-relaxed">
                        {restaurant.description || 'Descubre una experiencia gastronómica única en el corazón de Mérida. Nuestro restaurante ofrece lo mejor de la cocina regional con un toque contemporáneo.'}
                      </p>
                    </div>

                    {/* Restaurant Info Component */}
                    <RestaurantInfo
                      restaurant={{
                        address: restaurant.address,
                        zone: restaurant.zone,
                        phone: restaurant.phone,
                        email: restaurant.email,
                        website: restaurant.website,
                        instagram: restaurant.instagram,
                        facebook: restaurant.facebook,
                        openingHours: restaurant.openingHours,
                        features: restaurant.features || ['wifi', 'parking', 'accessible'],
                        paymentMethods: restaurant.paymentMethods || ['Efectivo', 'Tarjeta', 'Transferencia'],
                        cuisineType: restaurant.cuisine,
                        priceRange: restaurant.priceRange,
                      }}
                    />
                  </motion.div>
                </TabsContent>

                {/* Menu Tab */}
                <TabsContent value="menu">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {menuCategories.length > 0 ? (
                      menuCategories.map((category) => (
                        <div key={category} className="bg-card rounded-2xl p-6 shadow-card">
                          <h2 className="font-display text-xl font-semibold mb-4">{category}</h2>
                          <div className="space-y-4">
                            {menuItems
                              .filter(item => item.category === category)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
                                >
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{item.name}</p>
                                      {item.isHighlighted && (
                                        <Badge variant="secondary" className="text-xs">⭐ Destacado</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                                  </div>
                                  <p className="font-semibold text-primary text-lg">${item.price}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-card rounded-2xl p-8 shadow-card text-center">
                        <p className="text-muted-foreground">El menú aún no está disponible</p>
                        <p className="text-sm text-muted-foreground mt-2">Pronto agregaremos los platillos</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                {/* Offers Tab */}
                <TabsContent value="offers">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {offersForSection.length > 0 ? (
                      <OffersSection
                        offers={offersForSection}
                        onReserve={() => navigate(`/reservar/${restaurant.id}`)}
                      />
                    ) : (
                      <div className="bg-card rounded-2xl p-8 shadow-card text-center">
                        <p className="text-muted-foreground">No hay ofertas activas en este momento</p>
                        <p className="text-sm text-muted-foreground mt-2">¡Vuelve pronto para ver promociones!</p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <ReviewsList
                      reviews={reviews}
                      showStats={true}
                      averageRating={restaurant.rating}
                      totalReviews={restaurant.reviewCount}
                    />
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar - Reservation Card */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-28"
              >
                <div className="bg-card rounded-2xl p-6 shadow-elevated border border-border">
                  <h2 className="font-display text-xl font-semibold mb-2">Reservar mesa</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Elige tu mesa visualmente en nuestro mapa interactivo
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Hasta 10 personas</p>
                        <p className="text-xs text-muted-foreground">Mesas de 2 a 10</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Reserva anticipada</p>
                        <p className="text-xs text-muted-foreground">Hasta 30 días</p>
                      </div>
                    </div>
                  </div>

                  <Link to={`/reservar/${restaurant.id}`}>
                    <Button className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                      Reservar ahora
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Algunos horarios pueden requerir anticipo
                  </p>
                </div>

                {/* Quick Offers */}
                {restaurantOffers.length > 0 && (
                  <div className="mt-4 p-4 bg-accent/50 rounded-xl border border-accent">
                    <p className="text-sm font-medium mb-2">🔥 Oferta activa</p>
                    <p className="text-sm text-foreground">{restaurantOffers[0].title}</p>
                    <p className="text-xs text-muted-foreground">{restaurantOffers[0].discount}</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RestaurantProfilePage;
