import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

interface HeroSectionProps {
    onSearch: (query: string) => void;
}

const backgroundImages = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1920',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1920',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920',
];

const stats = [
    { value: '50+', label: 'Restaurantes' },
    { value: '1000+', label: 'Reservas' },
    { value: '4.8', label: 'Calificación' },
];

const HeroSection = ({ onSearch }: HeroSectionProps) => {
    const navigate = useNavigate();
    const [currentBg, setCurrentBg] = useState(0);
    const [searchValue, setSearchValue] = useState('');

    // Rotate background images
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBg((prev) => (prev + 1) % backgroundImages.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(searchValue);
    };

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
            {/* Background Images */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentBg}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0"
                >
                    <img
                        src={backgroundImages[currentBg]}
                        alt="Restaurant"
                        className="w-full h-full object-cover"
                    />
                </motion.div>
            </AnimatePresence>

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 text-center text-white">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    {/* Badge */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-sm">Reserva al instante</span>
                    </motion.div>

                    {/* Headline */}
                    <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                        Descubre los mejores<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                            restaurantes de Mérida
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                        Reserva tu mesa en segundos. Disfruta de experiencias gastronómicas únicas
                        en los restaurantes más exclusivos de Yucatán.
                    </p>

                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
                        <div className="flex flex-col md:flex-row gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                            {/* Search Input */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                                <Input
                                    type="text"
                                    placeholder="¿Qué se te antoja hoy?"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="w-full h-14 pl-12 bg-white/10 border-0 text-white placeholder:text-white/60 focus-visible:ring-1 focus-visible:ring-white/50"
                                />
                            </div>

                            {/* Location */}
                            <div className="relative hidden md:block">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                                <select className="h-14 w-44 pl-12 pr-4 bg-white/10 border-0 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/50">
                                    <option value="">Toda Mérida</option>
                                    <option value="centro">Centro</option>
                                    <option value="montejo">Montejo</option>
                                    <option value="norte">Norte</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                            </div>

                            {/* Search Button */}
                            <Button
                                type="submit"
                                size="lg"
                                className="h-14 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                            >
                                Buscar
                            </Button>
                        </div>
                    </form>

                    {/* Quick Links */}
                    <div className="flex flex-wrap justify-center gap-3 mt-6">
                        {['Yucateca', 'Mariscos', 'Italiana', 'Fusión'].map((cuisine) => (
                            <button
                                key={cuisine}
                                onClick={() => onSearch(cuisine)}
                                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-sm transition-colors"
                            >
                                {cuisine}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex justify-center gap-8 md:gap-16 mt-16"
                >
                    {stats.map((stat, index) => (
                        <div key={index} className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-white">
                                {stat.value}
                            </div>
                            <div className="text-sm text-white/60 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-1.5 h-1.5 rounded-full bg-white"
                    />
                </div>
            </motion.div>

            {/* Background Image Indicators */}
            <div className="absolute bottom-8 right-8 flex gap-2">
                {backgroundImages.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentBg(index)}
                        className={`w-2 h-2 rounded-full transition-all ${currentBg === index ? 'bg-white w-6' : 'bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </section>
    );
};

export default HeroSection;
