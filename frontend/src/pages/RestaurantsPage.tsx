import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchFilters from '@/components/SearchFilters';
import RestaurantCard from '@/components/RestaurantCard';
import { useRestaurants } from '@/hooks/useData';

const RestaurantsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('Todos');
  const [selectedCuisine, setSelectedCuisine] = useState('Todos');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Fetch restaurants from API with filters
  const { data: restaurants = [], isLoading } = useRestaurants({
    search: searchQuery || undefined,
    zone: selectedZone !== 'Todos' ? selectedZone : undefined,
    cuisine: selectedCuisine !== 'Todos' ? selectedCuisine : undefined,
    isOpen: showAvailableOnly ? true : undefined,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Restaurantes en Mérida
            </h1>
            <p className="text-muted-foreground">
              Encuentra el lugar perfecto para tu próxima experiencia gastronómica
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <SearchFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedZone={selectedZone}
              onZoneChange={setSelectedZone}
              selectedCuisine={selectedCuisine}
              onCuisineChange={setSelectedCuisine}
              showAvailableOnly={showAvailableOnly}
              onAvailableChange={setShowAvailableOnly}
            />
          </motion.div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-muted-foreground">
              {isLoading ? 'Cargando...' : `${restaurants.length} restaurante${restaurants.length !== 1 ? 's' : ''} encontrado${restaurants.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Restaurant Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card animate-pulse">
                  <div className="h-52 bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : restaurants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant, index) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} index={index} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-4xl">🍽️</span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">No se encontraron restaurantes</h3>
              <p className="text-muted-foreground">
                Intenta ajustar los filtros o buscar con otros términos
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RestaurantsPage;
