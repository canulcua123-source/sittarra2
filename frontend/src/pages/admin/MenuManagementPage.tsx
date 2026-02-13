import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Plus, Edit, Trash2, Star, Eye, EyeOff, Loader2, ExternalLink, Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/admin/AdminLayout';
import { useMenu, useUpdateMenuItem, useCreateMenuItem, useDeleteMenuItem } from '@/hooks/useData';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { MenuItem } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { API_BASE_URL } from '@/services/api';

const categories = ['Entradas', 'Platillos Principales', 'Mariscos', 'Postres', 'Bebidas'];

const MenuManagementPage = () => {
    const { restaurant } = useRestaurantAuth();
    const restaurantId = restaurant?.id;

    // Fetch menu items from API
    const { data: items = [], isLoading, error } = useMenu(restaurantId);

    // API mutations
    const updateMutation = useUpdateMenuItem();
    const createMutation = useCreateMenuItem();
    const deleteMutation = useDeleteMenuItem();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');

    // Image upload states
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [formData, setFormData] = useState<Partial<MenuItem>>({});

    const filteredItems = activeCategory === 'all'
        ? items
        : items.filter(i => i.category === activeCategory);
    const totalItems = items.length;
    const highlightedCount = items.filter(i => i.isHighlighted).length;

    const toggleHighlight = async (item: MenuItem) => {
        try {
            await updateMutation.mutateAsync({
                itemId: item.id,
                updates: { isHighlighted: !item.isHighlighted }
            });
            toast({ title: 'Menú actualizado', description: 'Estado destacado cambiado' });
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo actualizar el platillo', variant: 'destructive' });
        }
    };

    const toggleVisibility = async (item: MenuItem) => {
        try {
            await updateMutation.mutateAsync({
                itemId: item.id,
                updates: { isAvailable: !item.isAvailable }
            });
            toast({ title: 'Menú actualizado', description: 'Disponibilidad cambiada' });
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo actualizar el platillo', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este platillo?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast({ title: 'Platillo eliminado', description: 'El platillo fue removido del menú' });
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar el platillo', variant: 'destructive' });
        }
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: 'Error', description: 'La imagen no puede ser mayor a 5MB', variant: 'destructive' });
                return;
            }
            setImageFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Upload image to server
    const uploadImage = async (): Promise<string | null> => {
        if (!imageFile) return null;

        // Get token from localStorage
        const session = localStorage.getItem('mesafeliz_restaurant_session');
        const token = session ? JSON.parse(session).token : null;

        if (!token) {
            toast({ title: 'Error', description: 'No hay sesión activa', variant: 'destructive' });
            return null;
        }

        setIsUploading(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('image', imageFile);

            const response = await fetch(`${API_BASE_URL}/upload/menu-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: uploadFormData
            });

            const result = await response.json();

            if (result.success) {
                return result.data.url;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast({ title: 'Error', description: 'No se pudo subir la imagen', variant: 'destructive' });
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;

        // Upload image if there's a new file
        let imageUrl = editingItem?.image || '';
        if (imageFile) {
            const uploadedUrl = await uploadImage();
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            } else if (!editingItem?.image) {
                // If upload failed and no previous image, still continue without image
                console.warn('Image upload failed, continuing without image');
            }
        }

        const data = {
            restaurantId: restaurantId!,
            name: (form.elements.namedItem('name') as HTMLInputElement).value,
            description: (form.elements.namedItem('description') as HTMLTextAreaElement).value,
            price: parseFloat((form.elements.namedItem('price') as HTMLInputElement).value),
            category: formData.category || editingItem?.category || categories[0],
            image: imageUrl,
            isHighlighted: (form.elements.namedItem('isHighlighted') as any).checked,
            isAvailable: true
        };

        try {
            if (editingItem) {
                await updateMutation.mutateAsync({ itemId: editingItem.id, updates: data });
                toast({ title: 'Actualizado', description: 'Platillo guardado correctamente' });
            } else {
                await createMutation.mutateAsync(data as any);
                toast({
                    title: 'Creado',
                    description: 'Nuevo platillo agregado al menú. Ya puedes verlo en tu página pública.',
                    action: (
                        <Button variant="outline" size="sm" asChild>
                            <a href="/restaurantes" target="_blank" rel="noopener noreferrer">Ver página</a>
                        </Button>
                    )
                });
            }
            // Reset image states
            handleRemoveImage();
            setIsDialogOpen(false);
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo guardar el platillo', variant: 'destructive' });
        }
    };

    // Reset form when dialog opens
    const openDialog = (item: MenuItem | null) => {
        setEditingItem(item);
        setImageFile(null);
        setImagePreview(item?.image || null);
        setFormData({});
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2">Cargando menú...</span>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <p className="text-destructive">Error al cargar el menú</p>
                    <p className="text-muted-foreground text-sm mt-2">Verifica tu conexión e intenta de nuevo</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Menú Digital</h1>
                        <p className="text-muted-foreground">{totalItems} platillos • {highlightedCount} destacados</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" asChild className="gap-2">
                            <a href="/restaurantes" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                                Ver página pública
                            </a>
                        </Button>
                        <Button onClick={() => openDialog(null)} className="gap-2">
                            <Plus className="w-4 h-4" />Nuevo platillo
                        </Button>
                    </div>
                </div>

                <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                    <TabsList className="flex-wrap">
                        <TabsTrigger value="all">Todos ({items.length})</TabsTrigger>
                        {categories.map(cat => (
                            <TabsTrigger key={cat} value={cat}>
                                {cat} ({items.filter(i => i.category === cat).length})
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-xl">
                        <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">No hay platillos</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Agrega tu primer platillo al menú
                        </p>
                        <Button onClick={() => openDialog(null)}>
                            <Plus className="w-4 h-4 mr-2" />Agregar platillo
                        </Button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-card rounded-xl p-4 shadow-card border-2 ${!item.isAvailable ? 'opacity-50 border-muted' :
                                    item.isHighlighted ? 'border-warning/50' : 'border-transparent'
                                    }`}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold truncate">{item.name}</h3>
                                            {item.isHighlighted && <Star className="w-4 h-4 fill-warning text-warning flex-shrink-0" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Badge variant="outline">{item.category}</Badge>
                                        <p className="text-lg font-bold mt-1">${item.price}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => toggleHighlight(item)} title="Destacar">
                                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${item.isHighlighted ? 'fill-warning text-warning' : ''}`} />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => toggleVisibility(item)} title="Visibilidad">
                                            {item.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDialog(item)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar platillo' : 'Nuevo platillo'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave}>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <Label>Nombre</Label>
                                    <Input name="name" placeholder="Nombre del platillo" defaultValue={editingItem?.name} required />
                                </div>
                                <div>
                                    <Label>Descripción</Label>
                                    <Textarea name="description" placeholder="Descripción breve" defaultValue={editingItem?.description} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Precio (MXN)</Label>
                                        <Input name="price" type="number" step="0.01" placeholder="0" defaultValue={editingItem?.price} required />
                                    </div>
                                    <div>
                                        <Label>Categoría</Label>
                                        <Select
                                            defaultValue={editingItem?.category || categories[0]}
                                            onValueChange={(val) => setFormData({ ...formData, category: val })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <Label>Imagen del platillo</Label>
                                    <div className="mt-2">
                                        {imagePreview ? (
                                            <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed border-primary/30">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label
                                                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                                            >
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                                                    <p className="text-sm text-muted-foreground">
                                                        <span className="font-semibold text-primary">Haz clic para subir</span>
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG o WEBP (máx. 5MB)</p>
                                                </div>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleFileSelect}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Destacar en menú</Label>
                                    <Switch name="isHighlighted" defaultChecked={editingItem?.isHighlighted} id="isHighlighted" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading}>
                                    {(createMutation.isPending || updateMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {isUploading ? 'Subiendo...' : editingItem ? 'Guardar' : 'Crear'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout >
    );
};

export default MenuManagementPage;
