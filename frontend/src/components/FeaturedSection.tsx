import { motion } from 'framer-motion';
import { Star, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import RestaurantCard from '@/components/RestaurantCard';

interface Restaurant {
    id: string;
    name: string;
    image: string;
    cuisine: string;
    rating: number;
    reviewCount?: number;
    priceRange: string;
    zone: string;
    isOpen?: boolean;
    hasOffers?: boolean;
    offerTitle?: string;
}

interface FeaturedSectionProps {
    restaurants: Restaurant[];
    title?: string;
    subtitle?: string;
    type?: 'featured' | 'trending' | 'offers';
    isLoading?: boolean;
}

const sectionConfig = {
    featured: {
        icon: Sparkles,
        title: 'Destacados',
        subtitle: 'Los restaurantes más populares de Mérida',
        gradient: 'from-amber-500 to-orange-500',
    },
    trending: {
        icon: TrendingUp,
        title: 'Tendencia',
        subtitle: 'Los más reservados esta semana',
        gradient: 'from-blue-500 to-purple-500',
    },
    offers: {
        icon: Star,
        title: 'Con Ofertas',
        subtitle: 'Aprovecha las mejores promociones',
        gradient: 'from-green-500 to-teal-500',
    },
};

const FeaturedSection = ({
    restaurants,
    title,
    subtitle,
    type = 'featured',
    isLoading = false,
}: FeaturedSectionProps) => {
    const config = sectionConfig[type];
    const Icon = config.icon;

    if (isLoading) {
        return (
            <section className="py-16 bg-background">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-muted rounded-2xl h-80 animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (!restaurants || restaurants.length === 0) {
        return null;
    }

    return (
        <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col md:flex-row md:items-end justify-between mb-10"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-xl bg-gradient-to-r ${config.gradient}`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="font-display text-2xl md:text-3xl font-bold">
                                {title || config.title}
                            </h2>
                        </div>
                        <p className="text-muted-foreground">
                            {subtitle || config.subtitle}
                        </p>
                    </div>

                    <Link to="/restaurantes">
                        <Button variant="outline" className="mt-4 md:mt-0">
                            Ver todos
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </Link>
                </motion.div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restaurants.slice(0, 6).map((restaurant, index) => (
                        <motion.div
                            key={restaurant.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <RestaurantCard
                                restaurant={restaurant}
                                featured={index === 0 && type === 'featured'}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* View More CTA */}
                {restaurants.length > 6 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mt-10"
                    >
                        <Link to="/restaurantes">
                            <Button size="lg" className={`bg-gradient-to-r ${config.gradient} hover:opacity-90`}>
                                Explorar más restaurantes
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default FeaturedSection;
