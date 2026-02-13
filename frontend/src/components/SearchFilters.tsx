import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Static filter options
const zones = ['Todos', 'Centro', 'Montejo', 'Norte', 'Oriente', 'Poniente'];
const cuisines = ['Todos', 'Yucateca', 'Mariscos', 'Fusión', 'Internacional', 'Italiana', 'Mexicana'];

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  selectedCuisine: string;
  onCuisineChange: (cuisine: string) => void;
  showAvailableOnly: boolean;
  onAvailableChange: (available: boolean) => void;
}

const SearchFilters = ({
  searchQuery,
  onSearchChange,
  selectedZone,
  onZoneChange,
  selectedCuisine,
  onCuisineChange,
  showAvailableOnly,
  onAvailableChange,
}: SearchFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = selectedZone !== 'Todos' || selectedCuisine !== 'Todos' || showAvailableOnly;

  const clearFilters = () => {
    onZoneChange('Todos');
    onCuisineChange('Todos');
    onAvailableChange(false);
    onSearchChange('');
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar restaurantes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl border-border"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="lg"
          onClick={() => setShowFilters(!showFilters)}
          className="h-12 px-4"
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="ml-2 hidden sm:inline">Filtros</span>
          {hasActiveFilters && (
            <span className="ml-2 w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-6 pt-6 border-t border-border"
        >
          {/* Zone Filter */}
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-2 block">Zona</label>
            <div className="flex flex-wrap gap-2">
              {zones.map((zone) => (
                <button
                  key={zone}
                  onClick={() => onZoneChange(zone)}
                  className={cn(
                    'filter-chip',
                    selectedZone === zone && 'filter-chip-active'
                  )}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine Filter */}
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-2 block">Tipo de cocina</label>
            <div className="flex flex-wrap gap-2">
              {cuisines.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => onCuisineChange(cuisine)}
                  className={cn(
                    'filter-chip',
                    selectedCuisine === cuisine && 'filter-chip-active'
                  )}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          {/* Available Only */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showAvailableOnly}
                onChange={(e) => onAvailableChange(e.target.checked)}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Solo restaurantes abiertos</span>
            </label>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="mt-2">
              <X className="h-4 w-4 mr-2" />
              Limpiar filtros
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default SearchFilters;
