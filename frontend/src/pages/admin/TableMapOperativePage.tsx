import { useState, useEffect, useRef } from 'react';
import {
    Users, Clock, RefreshCw, Grid3X3, ZoomIn, ZoomOut,
    Edit, Settings, Check, Layout, Trash2, Move, MousePointer2, Plus, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import AdminLayout from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';
import { useTables, useUpdateTableStatus, useCreateTable, useUpdateTable, useDeleteTable } from '@/hooks/useData';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { Table, TableStatus, TableZone } from '@/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Extended table type for admin view
type AdminTable = Table & {
    currentReservation?: {
        customerName: string;
        time: string;
        guests: number;
        arrivedAt?: string;
    };
    nextReservation?: {
        customerName: string;
        time: string;
        guests: number;
    };
};

const TableMapOperativePage = () => {
    // Get restaurant ID from auth context
    const { restaurant } = useRestaurantAuth();
    const restaurantId = restaurant?.id;
    const { data: tablesData = [], isLoading, refetch } = useTables(restaurantId);

    const updateTableStatusMutation = useUpdateTableStatus();
    const createTableMutation = useCreateTable();
    const updateTableMutation = useUpdateTable();
    const deleteTableMutation = useDeleteTable();

    // Cast tables to admin type
    const adminMesas: AdminTable[] = tablesData.map(table => ({
        ...table,
    }));

    // Local state for tables during editing (for smooth, lag-free dragging)
    const [localMesas, setLocalMesas] = useState<AdminTable[]>([]);

    // Initialize local state when data loads or edit mode starts
    useEffect(() => {
        if (tablesData.length > 0) {
            setLocalMesas(tablesData.map(t => ({ ...t })));
        }
    }, [tablesData]);

    const [selectedMesa, setSelectedMesa] = useState<AdminTable | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedZone, setSelectedZone] = useState<TableZone>('main');

    // Modal de creación de mesa
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newTableNumber, setNewTableNumber] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [newTableShape, setNewTableShape] = useState<'round' | 'square'>('round');
    const [newTableZone, setNewTableZone] = useState<TableZone>('main');

    // Local state for form editing
    const [editNumber, setEditNumber] = useState('');
    const [editCapacity, setEditCapacity] = useState(4);
    const [editShape, setEditShape] = useState<'round' | 'square'>('round');
    const [editZone, setEditZone] = useState<TableZone>('main');

    // Map area constraints
    const mapWidth = 700;
    const mapHeight = 500;
    const tableSize = 60;
    const mapPadding = 20;

    // Use localMesas for rendering if we have them, otherwise fallback to prop data
    // But primarily we want to render from localMesas to see immediate drag updates
    const displayMesas = localMesas.length > 0 ? localMesas : adminMesas;
    const filteredMesas = displayMesas.filter(m => (m.zone || 'main') === selectedZone);

    const stats = {
        disponibles: displayMesas.filter(m => m.status === 'disponible').length,
        ocupadas: displayMesas.filter(m => m.status === 'ocupada').length,
        reservadas: displayMesas.filter(m => m.status === 'reservada').length,
        pendientes: displayMesas.filter(m => m.status === 'pendiente').length,
    };

    const totalCapacity = displayMesas.reduce((sum, m) => sum + m.capacity, 0);
    const currentGuests = displayMesas
        .filter(m => m.status === 'ocupada')
        .reduce((sum, m) => sum + (m.capacity || 0), 0);

    const getMesaClasses = (status: TableStatus) => {
        const base = 'flex flex-col items-center justify-center transition-all duration-200 select-none';
        switch (status) {
            case 'disponible':
                return `${base} bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400/50 text-white shadow-lg shadow-indigo-500/20`;
            case 'ocupada':
                return `${base} bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400/50 text-white shadow-lg shadow-rose-500/20`;
            case 'pendiente':
                return `${base} bg-gradient-to-br from-amber-400 to-amber-500 border-amber-300/50 text-white shadow-lg shadow-amber-500/20`;
            case 'reservada':
                return `${base} bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400/50 text-white shadow-lg shadow-emerald-500/20`;
            default:
                return base;
        }
    };

    // State for click-to-move interaction
    const [movingTableId, setMovingTableId] = useState<string | null>(null);

    const handleMesaClick = (mesa: AdminTable) => {
        if (isEditMode) {
            // In Edit Mode: Toggle selection for moving
            if (movingTableId === mesa.id) {
                setMovingTableId(null); // Deselect if already selected
                toast.info("Mesa deseleccionada", { duration: 1000 });
            } else {
                setMovingTableId(mesa.id); // Select for moving
                toast.info("Haz click en el mapa para mover la mesa", { duration: 2000 });
            }
            return;
        }

        // Normal Mode: Open Properties
        setSelectedMesa(mesa);
        setEditNumber(mesa.number);
        setEditCapacity(mesa.capacity);
        setEditShape(mesa.shape as 'round' | 'square');
        setEditZone((mesa.zone || 'main') as TableZone);
        setIsDialogOpen(true);
    };

    // CLICK-TO-MOVE HANDLER
    const handleMapClick = (e: React.MouseEvent) => {
        if (!isEditMode || !movingTableId || !mapRef.current) return;

        // Calculate click position relative to the map container
        const rect = mapRef.current.getBoundingClientRect();

        // Calculate raw X/Y considering zoom
        // (Click ClientX - Container Left) / Zoom
        const rawX = (e.clientX - rect.left) / zoom;
        const rawY = (e.clientY - rect.top) / zoom;

        // Center the table on the click (assume standard size if unknown)
        const currentTable = localMesas.find(t => t.id === movingTableId);
        const tWidth = currentTable?.width || tableSize;
        const tHeight = currentTable?.height || tableSize;

        const centerX = rawX - (tWidth / 2);
        const centerY = rawY - (tHeight / 2);

        // STRICT CLAMPING
        // Min: 0 (or padding)
        // Max: MapWidth - TableWidth
        const maxX = mapWidth - tWidth;
        const maxY = mapHeight - tHeight;

        const clampedX = Math.max(0, Math.min(centerX, maxX));
        const clampedY = Math.max(0, Math.min(centerY, maxY));

        // Update local state
        setLocalMesas(prev => prev.map(t =>
            t.id === movingTableId ? { ...t, x: clampedX, y: clampedY } : t
        ));
    };

    // Special click handler for edit icons specifically
    const handleEditIconClick = (e: React.MouseEvent, mesa: AdminTable) => {
        e.stopPropagation();
        // Allow opening properties even in edit mode via the icon
        setSelectedMesa(mesa);
        setEditNumber(mesa.number);
        setEditCapacity(mesa.capacity);
        setEditShape(mesa.shape as 'round' | 'square');
        setEditZone((mesa.zone || 'main') as TableZone);
        setIsDialogOpen(true);
    };

    const handleStatusChange = async (newStatus: TableStatus) => {
        if (!selectedMesa) return;
        try {
            await updateTableStatusMutation.mutateAsync({
                tableId: selectedMesa.id,
                status: newStatus
            });
            toast.success(`Mesa ${selectedMesa.number} actualizada`);
            refetch();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error('Error al actualizar estado');
        }
    };



    // Abrir modal de creación de mesa
    const handleOpenCreateDialog = () => {
        const nextNumber = adminMesas.length > 0
            ? Math.max(...adminMesas.map(m => parseInt(String(m.number)) || 0)) + 1
            : 1;
        setNewTableNumber(nextNumber.toString());
        setNewTableCapacity(4);
        setNewTableShape('round');
        setNewTableZone(selectedZone); // Usar zona actual como default
        setIsCreateDialogOpen(true);
    };

    // Helper para nombres de zona en español
    const getZoneName = (zone: TableZone) => {
        switch (zone) {
            case 'main': return 'Principal';
            case 'terrace': return 'Terraza';
            case 'vip': return 'VIP';
            default: return zone;
        }
    };

    // Calcular posición que evite superposición
    const calculateNewPosition = () => {
        const zoneMesas = adminMesas.filter(m => (m.zone || 'main') === newTableZone);
        // Posición en grid para evitar superposición
        const gridCols = Math.floor((mapWidth - mapPadding * 2) / (tableSize + 20));
        const index = zoneMesas.length;
        const col = index % gridCols;
        const row = Math.floor(index / gridCols);
        const x = mapPadding + col * (tableSize + 20) + 20;
        const y = mapPadding + row * (tableSize + 20) + 60; // offset por decoraciones
        // Mantener dentro de límites
        return {
            x: Math.min(x, mapWidth - tableSize - mapPadding),
            y: Math.min(y, mapHeight - tableSize - mapPadding)
        };
    };

    const handleCreateTable = async () => {
        if (!restaurantId) return;

        const { x, y } = calculateNewPosition();

        try {
            await createTableMutation.mutateAsync({
                restaurantId,
                number: newTableNumber,
                capacity: newTableCapacity,
                shape: newTableShape,
                zone: newTableZone,
                x,
                y
            });
            toast.success(`Mesa ${newTableNumber} agregada a ${getZoneName(newTableZone)}`);
            setIsCreateDialogOpen(false);
            // Si la mesa se crea en otra zona, cambiar a esa zona
            if (newTableZone !== selectedZone) {
                setSelectedZone(newTableZone);
            }
            refetch();
        } catch (err) {
            toast.error('Error al agregar mesa');
        }
    };

    // Save table edits when clicking 'Listo'
    const handleSaveTableEdits = async () => {
        if (!selectedMesa) {
            setIsDialogOpen(false);
            return;
        }

        // Only save if there are changes
        const hasChanges =
            editNumber !== selectedMesa.number ||
            editCapacity !== selectedMesa.capacity ||
            editShape !== selectedMesa.shape;

        if (hasChanges) {
            try {
                await updateTableMutation.mutateAsync({
                    tableId: selectedMesa.id,
                    updates: {
                        number: editNumber,
                        capacity: editCapacity,
                        shape: editShape
                    }
                });
                toast.success('Mesa actualizada');
                refetch();
            } catch (err) {
                toast.error('Error al guardar cambios');
            }
        }

        setIsDialogOpen(false);
    };

    // Logic to save all changes when exiting edit mode
    const handleToggleEditMode = async () => {
        if (isEditMode) {
            setMovingTableId(null); // Ensure nothing is selected
            // Saving changes...
            const updates = localMesas.filter(local => {
                const original = tablesData.find(t => t.id === local.id);
                if (!original) return false;
                return local.x !== original.x || local.y !== original.y;
            });

            if (updates.length > 0) {
                const toastId = toast.loading(`Guardando ${updates.length} cambios...`);
                try {
                    // Update sequentially to ensure consistency
                    for (const table of updates) {
                        await updateTableMutation.mutateAsync({
                            tableId: table.id,
                            updates: { x: table.x, y: table.y }
                        });
                    }
                    toast.dismiss(toastId);
                    toast.success('Diseño guardado correctamente');
                    refetch();
                } catch (err) {
                    toast.dismiss(toastId);
                    toast.error('Error al guardar algunos cambios');
                }
            }
            setIsEditMode(false);
        } else {
            // Check if we have freshest data before starting edit
            refetch().then(() => {
                setLocalMesas(tablesData.map(t => ({ ...t })));
                setIsEditMode(true);
            });
        }
    };


    const handleDeleteTable = async () => {
        if (!selectedMesa) return;

        try {
            await deleteTableMutation.mutateAsync(selectedMesa.id);
            toast.success('Mesa eliminada');
            refetch();
            setIsDialogOpen(false);
            setSelectedMesa(null);
        } catch (err) {
            toast.error('Error al eliminar mesa');
        }
    };

    const handleSeedTables = async () => {
        if (!restaurantId || adminMesas.length > 0) return;

        const initialTables = [
            { number: '1', capacity: 2, shape: 'round', x: 100, y: 150 },
            { number: '2', capacity: 2, shape: 'round', x: 250, y: 150 },
            { number: '3', capacity: 4, shape: 'square', x: 400, y: 150 },
            { number: '4', capacity: 4, shape: 'square', x: 550, y: 150 },
        ];

        try {
            for (const table of initialTables) {
                await createTableMutation.mutateAsync({
                    ...table,
                    restaurantId
                });
            }
            toast.success('Diseño inicial generado');
            refetch();
        } catch (err) {
            toast.error('Error al generar diseño');
        }
    };

    const handleDragStart = () => {
        if (!isEditMode) return;
    };

    const getTimeElapsed = (arrivedAt: string | undefined) => {
        if (!arrivedAt) return '';
        // Simulated time calculation
        const arrival = new Date(`2024-02-15T${arrivedAt}:00`);
        const now = new Date();
        const diff = Math.floor((now.getTime() - arrival.getTime()) / (1000 * 60));
        if (diff < 60) return `${diff} min`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    // Ref for the map container to strictly constrain drag
    const mapRef = useRef<HTMLDivElement>(null);

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Mapa de Mesas</h1>
                        <p className="text-muted-foreground">
                            Vista operativa en tiempo real • {currentGuests} personas en el restaurante
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={isEditMode ? "default" : "outline"}
                            size="sm"
                            onClick={handleToggleEditMode}
                            className={cn(
                                "gap-2 transition-all duration-300",
                                isEditMode ? "bg-green-600 hover:bg-green-700 w-40" : ""
                            )}
                        >
                            {isEditMode ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Guardar Diseño
                                </>
                            ) : (
                                <>
                                    <Edit className="w-4 h-4" />
                                    Configurar Mapa
                                </>
                            )}
                        </Button>
                        {!isEditMode && (
                            <Button
                                variant={autoRefresh ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className="gap-2"
                            >
                                <RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} />
                                Auto-refresh
                            </Button>
                        )}
                        {isEditMode && (
                            <Button size="sm" className="gap-2" onClick={handleOpenCreateDialog} disabled={createTableMutation.isPending}>
                                {createTableMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Agregar Mesa
                            </Button>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-success/10 rounded-xl p-4 text-center border border-success/20">
                        <p className="text-3xl font-bold text-success">{stats.disponibles}</p>
                        <p className="text-sm text-muted-foreground">Disponibles</p>
                    </div>
                    <div className="bg-destructive/10 rounded-xl p-4 text-center border border-destructive/20">
                        <p className="text-3xl font-bold text-destructive">{stats.ocupadas}</p>
                        <p className="text-sm text-muted-foreground">Ocupadas</p>
                    </div>
                    <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
                        <p className="text-3xl font-bold text-primary">{stats.reservadas}</p>
                        <p className="text-sm text-muted-foreground">Reservadas</p>
                    </div>
                    <div className="bg-warning/10 rounded-xl p-4 text-center border border-warning/20">
                        <p className="text-3xl font-bold text-warning">{stats.pendientes}</p>
                        <p className="text-sm text-muted-foreground">Pendientes</p>
                    </div>
                </div>

                {/* Map Controls */}
                <div className="flex items-center justify-between bg-card rounded-xl p-4 shadow-card">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Planta:</span>
                        <Select value={selectedZone} onValueChange={(v) => setSelectedZone(v as TableZone)}>
                            <SelectTrigger className="w-32">
                                <Grid3X3 className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="main">Principal</SelectItem>
                                <SelectItem value="terrace">Terraza</SelectItem>
                                <SelectItem value="vip">VIP</SelectItem>
                            </SelectContent>
                        </Select>

                        {isEditMode && (
                            <div className="hidden md:flex items-center gap-2 border-l pl-4 ml-4">
                                <MousePointer2 className="w-4 h-4 text-primary" />
                                <span className="text-xs font-medium text-primary uppercase tracking-wider">Modo Edición: Haz clic en mesa para mover</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                        >
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                        >
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Table Map */}
                <div className="bg-card rounded-xl p-6 shadow-card overflow-hidden border border-border/50">
                    <motion.div
                        ref={mapRef}
                        onClick={handleMapClick}
                        className={cn(
                            "relative mx-auto bg-background/50 rounded-xl overflow-hidden shadow-inner",
                            isEditMode && movingTableId ? "cursor-crosshair ring-2 ring-primary/20" : ""
                        )}
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top left',
                            width: `${mapWidth}px`,
                            height: `${mapHeight}px`,
                            // Clean dot pattern background
                            backgroundImage: isEditMode
                                ? 'radial-gradient(circle, hsl(var(--primary) / 0.2) 1px, transparent 1px)'
                                : 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.1) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}
                    >
                        {/* Grid area indicator when in edit mode */}
                        {isEditMode && (
                            <div
                                className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-xl pointer-events-none"
                                style={{ zIndex: 1 }}
                            >
                                <span className="absolute -top-6 left-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    Área Edición ({mapWidth}x{mapHeight}px)
                                </span>
                            </div>
                        )}

                        {/* Floor decorations - More subtle */}
                        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-muted/20 to-transparent flex justify-center pt-2 pointer-events-none">
                            <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">Entrada Principal</span>
                        </div>

                        {/* Tables */}
                        {filteredMesas.length === 0 && !isLoading && isEditMode && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-2xl bg-muted/5 p-8 pointer-events-none">
                                <Layout className="w-16 h-16 text-muted-foreground/20 mb-4" />
                                <p className="text-muted-foreground font-medium text-lg">Zona vacía</p>
                                <p className="text-sm text-muted-foreground/60 mb-6">Comienza a diseñar tu espacio</p>
                            </div>
                        )}

                        {filteredMesas.map((mesa) => (
                            <Tooltip key={mesa.id}>
                                <TooltipTrigger asChild>
                                    <motion.div
                                        // Standard click-to-move implementation - NO DRAG
                                        layout={false} // No automatic layout spring
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent tracking click on map
                                            handleMesaClick(mesa);
                                        }}
                                        initial={false}
                                        animate={{
                                            scale: movingTableId === mesa.id ? 1.1 : 1,
                                            boxShadow: isEditMode
                                                ? (movingTableId === mesa.id
                                                    ? '0 0 0 4px hsl(var(--primary) / 0.5), 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                                    : '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
                                                : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                                        }}
                                        transition={{ duration: 0.1 }}
                                        whileHover={{
                                            scale: isEditMode ? 1.05 : 1.02,
                                            cursor: isEditMode ? 'pointer' : 'pointer'
                                        }}
                                        className={cn(
                                            getMesaClasses(mesa.status),
                                            isEditMode ? 'cursor-pointer' : '',
                                            "border-2 transform-gpu transition-colors",
                                            movingTableId === mesa.id ? "ring-2 ring-primary z-50 brightness-110" : "z-10"
                                        )}
                                        style={{
                                            position: 'absolute',
                                            left: (mesa.x || 0) + 40,
                                            top: (mesa.y || 0) + 60,
                                            width: mesa.width || 60,
                                            height: mesa.height || 60,
                                            borderRadius: mesa.shape === 'round' ? '50%' : '16px',
                                        }}
                                    >
                                        {/* Status Indicator Dot */}
                                        <div className={cn(
                                            "absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white/50",
                                            mesa.status === 'disponible' && "bg-green-400",
                                            mesa.status === 'ocupada' && "bg-red-400",
                                            mesa.status === 'reservada' && "bg-blue-400",
                                            mesa.status === 'pendiente' && "bg-yellow-400 animate-pulse"
                                        )} />

                                        {isEditMode && (
                                            <div
                                                className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md scale-75 cursor-pointer hover:scale-100 transition-transform"
                                                onClick={(e) => handleEditIconClick(e, mesa)}
                                            >
                                                <Edit className="w-3 h-3" />
                                            </div>
                                        )}

                                        <span className="text-xl font-black tracking-tight drop-shadow-sm">{mesa.number}</span>
                                        <span className="text-[10px] uppercase font-bold opacity-90">{mesa.capacity} pers</span>
                                    </motion.div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs bg-popover/95 backdrop-blur-sm border-2">
                                    <div className="space-y-1">
                                        <p className="font-bold flex items-center justify-between">
                                            <span>Mesa {mesa.number}</span>
                                            <Badge variant="outline" className="text-[10px] h-5">{getZoneName(mesa.zone || 'main')}</Badge>
                                        </p>
                                        <p className="text-sm">Capacidad: {mesa.capacity} personas</p>
                                        {isEditMode && <p className="text-[10px] text-primary italic font-medium">✨ Arrastra para mover</p>}
                                        {!isEditMode && mesa.currentReservation && (
                                            <div className="text-sm border-t pt-2 mt-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                        {mesa.currentReservation.customerName.charAt(0)}
                                                    </div>
                                                    <p className="font-semibold">{mesa.currentReservation.customerName}</p>
                                                </div>
                                                <p className="text-muted-foreground text-xs pl-8">
                                                    {mesa.currentReservation.guests} pers • {mesa.currentReservation.arrivedAt && getTimeElapsed(mesa.currentReservation.arrivedAt)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </motion.div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-mesa-disponible" />
                        <span className="text-sm">Disponible</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-mesa-ocupada" />
                        <span className="text-sm">Ocupada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-mesa-reservada" />
                        <span className="text-sm">Reservada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-mesa-pendiente animate-pulse" />
                        <span className="text-sm">Pendiente</span>
                    </div>
                </div>

                {/* Mesa Detail Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        {selectedMesa && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        Mesa {selectedMesa.number}
                                        <Badge variant="outline">{selectedMesa.capacity} personas</Badge>
                                    </DialogTitle>
                                    <DialogDescription>
                                        Estado actual: {selectedMesa.status}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    {isEditMode ? (
                                        <div className="space-y-4 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Número de Mesa</Label>
                                                    <Input
                                                        value={editNumber}
                                                        onChange={(e) => setEditNumber(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Capacidad</Label>
                                                    <Input
                                                        type="number"
                                                        value={editCapacity}
                                                        onChange={(e) => setEditCapacity(parseInt(e.target.value) || 1)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Forma</Label>
                                                <Select
                                                    value={editShape}
                                                    onValueChange={(v) => setEditShape(v as 'round' | 'square')}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="round">Redonda</SelectItem>
                                                        <SelectItem value="square">Cuadrada</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {selectedMesa.currentReservation && (
                                                <div className="p-4 rounded-lg bg-muted">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Users className="w-4 h-4" />
                                                        <span className="font-medium">Ocupación actual</span>
                                                    </div>
                                                    <p className="font-semibold">{selectedMesa.currentReservation.customerName}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedMesa.currentReservation.guests} personas • Llegó a las {selectedMesa.currentReservation.arrivedAt}
                                                    </p>
                                                    {selectedMesa.currentReservation.arrivedAt && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            <Clock className="w-3 h-3 inline mr-1" />
                                                            Tiempo: {getTimeElapsed(selectedMesa.currentReservation.arrivedAt)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {selectedMesa.nextReservation && (
                                                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Clock className="w-4 h-4" />
                                                        <span className="font-medium">Próxima reserva</span>
                                                    </div>
                                                    <p className="font-semibold">{selectedMesa.nextReservation.customerName}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedMesa.nextReservation.time} • {selectedMesa.nextReservation.guests} personas
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <p className="text-sm font-medium mb-2">Cambiar estado:</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="gap-2 justify-start"
                                                        onClick={() => handleStatusChange('disponible')}
                                                        disabled={updateTableStatusMutation.isPending}
                                                    >
                                                        {updateTableStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-3 h-3 rounded bg-mesa-disponible" />}
                                                        Disponible
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="gap-2 justify-start"
                                                        onClick={() => handleStatusChange('ocupada')}
                                                        disabled={updateTableStatusMutation.isPending}
                                                    >
                                                        {updateTableStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-3 h-3 rounded bg-mesa-ocupada" />}
                                                        Ocupada
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="gap-2 justify-start"
                                                        onClick={() => handleStatusChange('reservada')}
                                                        disabled={updateTableStatusMutation.isPending}
                                                    >
                                                        {updateTableStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-3 h-3 rounded bg-mesa-reservada" />}
                                                        Reservada
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="gap-2 justify-start"
                                                        onClick={() => handleStatusChange('pendiente')}
                                                        disabled={updateTableStatusMutation.isPending}
                                                    >
                                                        {updateTableStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-3 h-3 rounded bg-mesa-pendiente" />}
                                                        Pendiente
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <DialogFooter>
                                    {isEditMode ? (
                                        <div className="flex justify-between w-full">
                                            <Button variant="destructive" className="gap-2" onClick={handleDeleteTable} disabled={deleteTableMutation.isPending}>
                                                {deleteTableMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                Eliminar Mesa
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleSaveTableEdits}
                                                disabled={updateTableMutation.isPending}
                                            >
                                                {updateTableMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Guardar
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Button variant="outline" className="gap-2" onClick={() => setIsEditMode(true)}>
                                                <Edit className="w-4 h-4" />
                                                Modo Edición
                                            </Button>
                                            {selectedMesa.status === 'ocupada' && (
                                                <Button className="gap-2" onClick={() => handleStatusChange('disponible')}>
                                                    <Check className="w-4 h-4" />
                                                    Liberar mesa
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Modal de Creación de Mesa */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Plus className="w-5 h-5 text-primary" />
                                Agregar Nueva Mesa
                            </DialogTitle>
                            <DialogDescription>
                                Configura los detalles de la nueva mesa
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Número de Mesa</Label>
                                    <Input
                                        value={newTableNumber}
                                        onChange={(e) => setNewTableNumber(e.target.value)}
                                        placeholder="Ej: 15"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Capacidad (personas)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={newTableCapacity}
                                        onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Forma</Label>
                                    <Select
                                        value={newTableShape}
                                        onValueChange={(v) => setNewTableShape(v as 'round' | 'square')}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="round">🔵 Redonda</SelectItem>
                                            <SelectItem value="square">🟩 Cuadrada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Zona / Área</Label>
                                    <Select
                                        value={newTableZone}
                                        onValueChange={(v) => setNewTableZone(v as TableZone)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="main">🏠 Principal</SelectItem>
                                            <SelectItem value="terrace">🌿 Terraza</SelectItem>
                                            <SelectItem value="vip">⭐ VIP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateTable}
                                disabled={createTableMutation.isPending || !newTableNumber}
                                className="gap-2"
                            >
                                {createTableMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                                Crear Mesa
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default TableMapOperativePage;
