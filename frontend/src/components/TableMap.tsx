import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ZoomIn, ZoomOut, Check, Layout, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: string;
  availability_status: 'available' | 'reserved' | 'occupied' | 'blocked';
  is_selectable: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
  shape?: 'round' | 'square' | 'rectangle';
}

interface TableMapProps {
  tables: Table[];
  selectedTableId?: string;
  onTableSelect: (table: Table) => void;
  isLoading?: boolean;
}

const TableMap = ({ tables, selectedTableId, onTableSelect, isLoading }: TableMapProps) => {
  const [zoom, setZoom] = useState(0.7); // Start slightly zoomed out to fit better on smaller screens
  const mapWidth = 800;
  const mapHeight = 600;

  const getStatusColor = (status: string, isSelected: boolean) => {
    if (isSelected) return 'bg-primary border-primary text-primary-foreground shadow-lg scale-110';

    switch (status) {
      case 'available':
        return 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200';
      case 'reserved':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700 cursor-not-allowed opacity-80';
      case 'occupied':
        return 'bg-red-100 border-red-500 text-red-700 cursor-not-allowed opacity-80';
      case 'blocked':
        return 'bg-gray-200 border-gray-400 text-gray-500 cursor-not-allowed opacity-60';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/10 rounded-xl border-2 border-dashed">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando mapa del restaurante...</p>
        </div>
      </div>
    );
  }

  if (!tables || tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-muted/10 rounded-xl border-2 border-dashed p-8 text-center">
        <Layout className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <p className="text-muted-foreground font-medium">No hay mesas disponibles para esta configuración.</p>
        <p className="text-sm text-muted-foreground mt-2">Intenta cambiar la fecha o el horario.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex items-center justify-between bg-card p-2 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 px-2">
          <Layout className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Mapa del Restaurante</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom(Math.min(1.2, zoom + 0.1))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative bg-muted/10 rounded-xl border overflow-hidden h-[400px] w-full flex items-center justify-center">
        <div className="overflow-auto w-full h-full flex items-center justify-center p-8 bg-grid-pattern">
          <motion.div
            className="relative bg-white shadow-xl rounded-lg border"
            style={{
              width: mapWidth,
              height: mapHeight,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: zoom }}
            transition={{ duration: 0.3 }}
          >
            {/* Floor decorations */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-12 w-32 bg-muted/30 rounded-b-lg flex items-center justify-center text-muted-foreground text-sm border-b border-x border-muted/50">
              🚪 Entrada
            </div>
            <div className="absolute bottom-4 right-4 w-32 h-24 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground text-sm border border-muted/50">
              🍽️ Cocina
            </div>
            <div className="absolute top-20 left-4 w-24 h-40 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground text-sm border border-muted/50 [writing-mode:vertical-lr]">
              🍹 Bar
            </div>

            {/* Tables */}
            <TooltipProvider>
              {tables.map((table) => {
                const isSelected = selectedTableId === table.id;
                const isSelectable = table.is_selectable;

                return (
                  <Tooltip key={table.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        onClick={() => isSelectable && onTableSelect(table)}
                        whileHover={isSelectable ? { scale: 1.05 } : {}}
                        whileTap={isSelectable ? { scale: 0.95 } : {}}
                        className={cn(
                          "absolute flex flex-col items-center justify-center transition-colors border-2 cursor-pointer",
                          getStatusColor(table.availability_status, isSelected),
                          table.shape === 'round' ? 'rounded-full' : 'rounded-xl',
                          !isSelectable && "cursor-not-allowed"
                        )}
                        style={{
                          left: table.x + 40, // Base offset matching admin view
                          top: table.y + 60,
                          width: table.width || 60,
                          height: table.height || 60,
                          zIndex: 10
                        }}
                      >
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-0.5 shadow-md">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <span className="font-bold text-lg">{table.number}</span>
                        <div className="flex items-center gap-0.5 text-[10px] font-medium opacity-80">
                          <Users className="w-3 h-3" />
                          <span>{table.capacity}</span>
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center p-1">
                        <p className="font-semibold">Mesa {table.number}</p>
                        <p className="text-xs text-muted-foreground">{table.capacity} personas</p>
                        <p className={cn(
                          "text-xs font-medium mt-1 uppercase",
                          table.availability_status === 'available' ? 'text-green-600' : 'text-red-500'
                        )}>
                          {isSelectable ? 'Disponible para reservar' :
                            table.availability_status === 'available' ? 'Capacidad no coincide' : 'No disponible'}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </motion.div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center p-4 bg-muted/30 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-100 border border-green-500"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary border border-primary"></div>
          <span>Seleccionada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-100 border border-red-500"></div>
          <span>Ocupada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-100 border border-yellow-500"></div>
          <span>Reservada</span>
        </div>
      </div>
    </div>
  );
};

export default TableMap;
