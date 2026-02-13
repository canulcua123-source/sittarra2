import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Plus, Calendar, Percent, Edit, Trash2, Eye, EyeOff, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/components/admin/AdminLayout';
import { useRestaurantOffers, useCreateOffer, useUpdateOffer, useDeleteOffer } from '@/hooks/useData';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { Offer } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const OffersManagementPage = () => {
    const { restaurant } = useRestaurantAuth();
    const restaurantId = restaurant?.id;

    const { data: offers = [], isLoading, error, refetch } = useRestaurantOffers(restaurantId);
    const createOfferMutation = useCreateOffer();
    const updateOfferMutation = useUpdateOffer();
    const deleteOfferMutation = useDeleteOffer();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [discount, setDiscount] = useState('');
    const [discountType, setDiscountType] = useState('percentage');
    const [validFrom, setValidFrom] = useState('');
    const [validUntil, setValidUntil] = useState('');

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDiscount('');
        setDiscountType('percentage');
        setValidFrom('');
        setValidUntil('');
    };

    const handleOpenCreate = () => {
        resetForm();
        setEditingOffer(null);
        setIsCreateOpen(true);
    };

    const handleOpenEdit = (offer: Offer) => {
        setTitle(offer.title);
        setDescription(offer.description);
        setDiscount(offer.discount);
        setDiscountType(offer.discountType || 'percentage');
        setValidFrom(offer.validFrom || '');
        setValidUntil(offer.validUntil || '');
        setEditingOffer(offer);
        setIsCreateOpen(false);
    };

    const handleClose = () => {
        setIsCreateOpen(false);
        setEditingOffer(null);
        resetForm();
    };

    const handleSubmit = async () => {
        if (!title || !description || !discount) {
            toast.error('Por favor completa todos los campos requeridos');
            return;
        }

        if (!restaurantId) {
            toast.error('No se encontró el ID del restaurante. Por favor, cierra sesión y vuelve a iniciar.');
            console.error('restaurantId is undefined. Restaurant data:', restaurant);
            return;
        }

        try {
            if (editingOffer) {
                await updateOfferMutation.mutateAsync({
                    offerId: editingOffer.id,
                    updates: {
                        title,
                        description,
                        discount,
                        discountType,
                        validFrom: validFrom || undefined,
                        validUntil: validUntil || undefined,
                    }
                });
                toast.success('Oferta actualizada exitosamente');
            } else {
                await createOfferMutation.mutateAsync({
                    restaurantId,
                    offer: {
                        title,
                        description,
                        discount,
                        discountType,
                        validFrom: validFrom || undefined,
                        validUntil: validUntil || undefined,
                    }
                });
                toast.success('Oferta creada exitosamente');
            }
            handleClose();
            refetch();
        } catch (err) {
            toast.error(editingOffer ? 'Error al actualizar la oferta' : 'Error al crear la oferta');
            console.error('Error submitting offer:', err);
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await updateOfferMutation.mutateAsync({
                offerId: id,
                updates: { isActive: !currentStatus }
            });
            toast.success('Estado actualizado');
            refetch();
        } catch (err) {
            toast.error('Error al actualizar estado');
            console.error('Error toggling status:', err);
        }
    };

    const handleDeleteOffer = async (id: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta oferta?')) {
            try {
                await deleteOfferMutation.mutateAsync(id);
                toast.success('Oferta eliminada exitosamente');
                refetch();
            } catch (err) {
                toast.error('Error al eliminar la oferta');
                console.error('Error deleting offer:', err);
            }
        }
    };

    const activeCount = offers.filter(o => o.isActive).length;

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2">Cargando ofertas...</span>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Gestión de Ofertas</h1>
                        <p className="text-muted-foreground">{activeCount} ofertas activas</p>
                    </div>
                    <Button onClick={handleOpenCreate} className="gap-2">
                        <Plus className="w-4 h-4" />Nueva oferta
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
                        <Tag className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold">{offers.length}</p>
                        <p className="text-xs text-muted-foreground">Total ofertas</p>
                    </div>
                    <div className="bg-success/10 rounded-xl p-4 text-center border border-success/20">
                        <Eye className="w-6 h-6 text-success mx-auto mb-2" />
                        <p className="text-2xl font-bold">{activeCount}</p>
                        <p className="text-xs text-muted-foreground">Activas</p>
                    </div>
                    <div className="bg-secondary/10 rounded-xl p-4 text-center border border-secondary/20">
                        <Percent className="w-6 h-6 text-secondary mx-auto mb-2" />
                        <p className="text-2xl font-bold">{offers.reduce((sum, o) => sum + (o.usageCount || 0), 0)}</p>
                        <p className="text-xs text-muted-foreground">Usos totales</p>
                    </div>
                </div>

                {offers.length === 0 ? (
                    <div className="text-center py-16 bg-card rounded-xl border-2 border-dashed">
                        <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-lg font-semibold">No tienes ofertas creadas</h3>
                        <p className="text-muted-foreground mb-6">Crea promociones para atraer más clientes a tu restaurante.</p>
                        <Button onClick={handleOpenCreate}>Crear mi primera oferta</Button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {offers.map((offer, index) => (
                            <motion.div
                                key={offer.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-card rounded-xl p-6 shadow-card border-2 ${offer.isActive ? 'border-success/30' : 'border-transparent opacity-70'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <Badge className={offer.isActive ? 'bg-success' : 'bg-muted'}>{offer.isActive ? 'Activa' : 'Inactiva'}</Badge>
                                    <Switch
                                        checked={offer.isActive}
                                        onCheckedChange={() => toggleActive(offer.id, offer.isActive)}
                                    />
                                </div>
                                <h3 className="text-xl font-display font-bold mb-2">{offer.title}</h3>
                                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{offer.description}</p>
                                <div className="bg-secondary/10 rounded-lg p-3 text-center mb-4">
                                    <p className="text-2xl font-bold text-secondary">{offer.discount}</p>
                                </div>
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                            {offer.validFrom ? format(new Date(offer.validFrom), 'PP', { locale: es }) : 'Cualquier fecha'} - {offer.validUntil ? format(new Date(offer.validUntil), 'PP', { locale: es }) : 'Sin límite'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>{offer.usageCount || 0} usos reales</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenEdit(offer)}>
                                        <Edit className="w-4 h-4 mr-1" />Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteOffer(offer.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                <Dialog open={isCreateOpen || !!editingOffer} onOpenChange={(open) => { if (!open) handleClose(); }}>
                    <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-display font-bold mb-1">
                                    {editingOffer ? '✏️ Editar oferta' : '✨ Nueva oferta'}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-white/80">
                                    Crea promociones irresistibles para tus clientes
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Title Input */}
                            <div className="relative">
                                <Label className="text-sm font-medium mb-2 block">Título de la oferta</Label>
                                <Input
                                    placeholder="Ej: 2x1 en bebidas"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-11 border-2 focus:border-primary transition-colors"
                                />
                            </div>

                            {/* Description Textarea */}
                            <div className="relative">
                                <Label className="text-sm font-medium mb-2 block">Descripción</Label>
                                <Textarea
                                    placeholder="Describe los detalles de tu promoción..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="min-h-[100px] border-2 focus:border-primary transition-colors resize-none"
                                    rows={4}
                                />
                            </div>
                            {/* Type and Discount Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium mb-2 block">Tipo de descuento</Label>
                                    <Select value={discountType} onValueChange={setDiscountType}>
                                        <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">💯 Porcentaje</SelectItem>
                                            <SelectItem value="fixed">💵 Monto fijo</SelectItem>
                                            <SelectItem value="2x1">🎁 2x1</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium mb-2 block">Valor</Label>
                                    <Input
                                        placeholder="20% o $100"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        className="h-11 border-2 focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">📅 Vigencia (Opcional)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs mb-1 block">Desde</Label>
                                        <Input
                                            type="date"
                                            value={validFrom}
                                            onChange={(e) => setValidFrom(e.target.value)}
                                            className="h-10 border-2"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-1 block">Hasta</Label>
                                        <Input
                                            type="date"
                                            value={validUntil}
                                            onChange={(e) => setValidUntil(e.target.value)}
                                            className="h-10 border-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="bg-muted/20 px-6 py-4 flex justify-end gap-3">
                            <Button variant="outline" onClick={handleClose} className="min-w-[100px]">
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createOfferMutation.isPending || updateOfferMutation.isPending}
                                className="min-w-[140px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                            >
                                {(createOfferMutation.isPending || updateOfferMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingOffer ? '💾 Guardar' : '✨ Crear oferta'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default OffersManagementPage;
