import { motion } from 'framer-motion';
import { Tag, Clock, Percent, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Offer {
    id: string;
    title: string;
    description: string;
    discount?: string;
    validDays?: string[];
    validHours?: string;
    validUntil?: string;
    code?: string;
}

interface OffersSectionProps {
    offers: Offer[];
    onReserve?: () => void;
}

const dayNames: Record<string, string> = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mié',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sáb',
    sunday: 'Dom',
};

const OffersSection = ({ offers, onReserve }: OffersSectionProps) => {
    if (!offers || offers.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h3 className="font-display text-xl font-bold">Ofertas Activas</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer, index) => (
                    <motion.div
                        key={offer.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                            "relative overflow-hidden rounded-xl p-5",
                            "bg-gradient-to-br from-accent/10 to-accent/5",
                            "border border-accent/20"
                        )}
                    >
                        {/* Discount Badge */}
                        {offer.discount && (
                            <div className="absolute -right-8 -top-8 w-24 h-24 bg-accent rounded-full flex items-end justify-start p-5">
                                <span className="text-accent-foreground font-bold text-lg transform -rotate-45">
                                    {offer.discount}
                                </span>
                            </div>
                        )}

                        {/* Content */}
                        <div className="pr-12">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 bg-accent/20 rounded-lg">
                                    <Tag className="h-5 w-5 text-accent" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg">{offer.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {offer.description}
                                    </p>
                                </div>
                            </div>

                            {/* Valid Days */}
                            {offer.validDays && offer.validDays.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {offer.validDays.map((day) => (
                                        <Badge key={day} variant="outline" className="text-xs">
                                            {dayNames[day.toLowerCase()] || day}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Valid Hours */}
                            {offer.validHours && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{offer.validHours}</span>
                                </div>
                            )}

                            {/* Valid Until */}
                            {offer.validUntil && (
                                <p className="text-xs text-muted-foreground">
                                    Válido hasta: {new Date(offer.validUntil).toLocaleDateString('es-MX')}
                                </p>
                            )}

                            {/* Code */}
                            {offer.code && (
                                <div className="mt-3 p-2 bg-background/50 rounded-lg border border-dashed border-accent/50 text-center">
                                    <span className="text-xs text-muted-foreground">Código: </span>
                                    <span className="font-mono font-bold text-accent">{offer.code}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* CTA Button */}
            {onReserve && (
                <Button onClick={onReserve} className="w-full mt-4">
                    Reservar con oferta
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            )}
        </div>
    );
};

export default OffersSection;
