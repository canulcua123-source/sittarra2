import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, TrendingUp, Clock, Users, AlertTriangle, Check, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AdminLayout from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';
import { useAISuggestions } from '@/hooks/useData';
import { useRestaurantAuth } from '@/contexts/RestaurantAuthContext';
import { AISuggestion } from '@/types';

const AISuggestionsPage = () => {
    const { restaurant } = useRestaurantAuth();
    const restaurantId = restaurant?.id;

    const { data: suggestions = [], isLoading } = useAISuggestions(restaurantId);

    const newCount = suggestions.filter(s => !s.isApplied).length;

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'alta': return <Badge className="bg-destructive">Alta prioridad</Badge>;
            case 'media': return <Badge className="bg-warning">Media</Badge>;
            case 'baja': return <Badge variant="outline">Baja</Badge>;
            default: return <Badge variant="outline">{priority}</Badge>;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'ocupacion': return <Users className="w-5 h-5 text-blue-500" />;
            case 'ofertas': return <TrendingUp className="w-5 h-5 text-green-500" />;
            case 'operacion': return <Clock className="w-5 h-5 text-purple-500" />;
            case 'marketing': return <Sparkles className="w-5 h-5 text-pink-500" />;
            default: return <Lightbulb className="w-5 h-5 text-amber-500" />;
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground animate-pulse">Analizando tus datos con IA...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center ring-4 ring-primary/5">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-bold">Sugerencias IA</h1>
                            <p className="text-muted-foreground">
                                {newCount > 0 ? `${newCount} nuevas sugerencias optimizadas para tu negocio` : "Tu restaurante está funcionando de forma óptima"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-2xl p-8 border border-primary/20 shadow-inner">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                        <div className="w-16 h-16 bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transform rotate-3">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-display font-bold mb-2">Asistente Inteligente Mesa Feliz</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base max-w-2xl">
                                Analizamos continuamente tus datos de reservas, ocupación y preferencias de clientes para darte recomendaciones personalizadas que aumenten tu rentabilidad.
                                <span className="block mt-2 font-medium text-foreground italic">Todas las sugerencias requieren tu aprobación antes de ser aplicadas.</span>
                            </p>
                        </div>
                    </div>
                </div>

                {suggestions.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Aún no hay suficientes datos</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">Sigue registrando reservaciones y llegadas para que nuestra IA pueda generar recomendaciones precisas.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {suggestions.filter(s => !s.isApplied).length > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-lg font-bold">Nuevas Recomendaciones</h2>
                                <Badge variant="secondary" className="rounded-full">{newCount}</Badge>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {suggestions.filter(s => !s.isApplied).map((suggestion, index) => (
                                <motion.div
                                    key={suggestion.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={cn(
                                        'bg-card rounded-2xl p-6 shadow-sm border transition-all hover:shadow-md',
                                        suggestion.priority === 'alta' ? 'border-l-4 border-l-destructive border-destructive/10' :
                                            suggestion.priority === 'media' ? 'border-l-4 border-l-warning border-warning/10' : 'border-l-4 border-l-muted border-muted/50'
                                    )}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center ring-1 ring-border">
                                                    {getCategoryIcon(suggestion.category)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg leading-tight">{suggestion.title}</h3>
                                                    <div className="flex gap-2 mt-1">
                                                        {getPriorityBadge(suggestion.priority)}
                                                        <Badge variant="outline" className="capitalize text-[10px]">{suggestion.category}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground text-sm mb-5 leading-relaxed">{suggestion.description}</p>
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-dashed">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Impacto Estimado</span>
                                                    <span className="font-semibold text-sm bg-primary/5 text-primary px-2 py-0.5 rounded">{suggestion.estimatedImpact}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Precisión</span>
                                                    <div className="flex items-center gap-2 bg-muted/50 px-2 py-0.5 rounded-full">
                                                        <Progress value={suggestion.confidence} className="w-16 h-1.5" />
                                                        <span className="font-bold text-xs">{suggestion.confidence}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-row lg:flex-col gap-2 pt-4 lg:pt-0">
                                            <Button className="flex-1 gap-2 shadow-sm whitespace-nowrap">
                                                <Check className="w-4 h-4" />
                                                {suggestion.actionLabel || 'Aplicar'}
                                            </Button>
                                            <Button variant="outline" className="flex-1">Descartar</Button>
                                            <Button variant="ghost" size="icon" className="hidden lg:flex"><ChevronRight className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {suggestions.filter(s => s.isApplied).length > 0 && (
                            <div className="mt-12 space-y-4">
                                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sugerencias Aplicadas con Éxito</h2>
                                <div className="grid gap-3">
                                    {suggestions.filter(s => s.isApplied).map(suggestion => (
                                        <div key={suggestion.id} className="bg-card/40 rounded-xl p-4 border border-dashed flex items-center justify-between opacity-75 grayscale-[0.5]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-success" />
                                                </div>
                                                <span className="font-medium text-sm">{suggestion.title}</span>
                                            </div>
                                            <Badge variant="outline" className="bg-success/5 text-success border-success/20 text-[10px]">Optimizado correctamente</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AISuggestionsPage;
