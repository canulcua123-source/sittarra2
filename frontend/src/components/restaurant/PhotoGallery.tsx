import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PhotoGalleryProps {
    photos: string[];
    restaurantName: string;
}

const PhotoGallery = ({ photos, restaurantName }: PhotoGalleryProps) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Use placeholder if no photos
    const displayPhotos = photos.length > 0
        ? photos
        : [
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
            'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
            'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
        ];

    const openLightbox = (index: number) => {
        setSelectedIndex(index);
        setIsOpen(true);
    };

    const closeLightbox = () => {
        setIsOpen(false);
        setSelectedIndex(null);
    };

    const goToPrevious = () => {
        if (selectedIndex === null) return;
        setSelectedIndex(selectedIndex === 0 ? displayPhotos.length - 1 : selectedIndex - 1);
    };

    const goToNext = () => {
        if (selectedIndex === null) return;
        setSelectedIndex(selectedIndex === displayPhotos.length - 1 ? 0 : selectedIndex + 1);
    };

    return (
        <>
            {/* Gallery Grid */}
            <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden">
                {/* Main Image */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => openLightbox(0)}
                    className="col-span-4 md:col-span-2 md:row-span-2 relative cursor-pointer group"
                >
                    <img
                        src={displayPhotos[0]}
                        alt={`${restaurantName} - Principal`}
                        className="w-full h-48 md:h-80 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </motion.div>

                {/* Secondary Images */}
                {displayPhotos.slice(1, 5).map((photo, index) => (
                    <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => openLightbox(index + 1)}
                        className={cn(
                            "relative cursor-pointer group hidden md:block",
                            index === 3 && displayPhotos.length > 5 && "relative"
                        )}
                    >
                        <img
                            src={photo}
                            alt={`${restaurantName} - ${index + 2}`}
                            className="w-full h-[9.5rem] object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* More photos indicator */}
                        {index === 3 && displayPhotos.length > 5 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white text-xl font-bold">
                                    +{displayPhotos.length - 5} más
                                </span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Lightbox Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-5xl bg-black/95 border-none p-0">
                    <div className="relative h-[80vh] flex items-center justify-center">
                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={closeLightbox}
                            className="absolute top-4 right-4 text-white hover:bg-white/20 z-50"
                        >
                            <X className="h-6 w-6" />
                        </Button>

                        {/* Navigation */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPrevious}
                            className="absolute left-4 text-white hover:bg-white/20 z-50"
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNext}
                            className="absolute right-4 text-white hover:bg-white/20 z-50"
                        >
                            <ChevronRight className="h-8 w-8" />
                        </Button>

                        {/* Image */}
                        <AnimatePresence mode="wait">
                            {selectedIndex !== null && (
                                <motion.img
                                    key={selectedIndex}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    src={displayPhotos[selectedIndex]}
                                    alt={`${restaurantName} - Foto ${selectedIndex + 1}`}
                                    className="max-h-full max-w-full object-contain"
                                />
                            )}
                        </AnimatePresence>

                        {/* Photo Counter */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                            {selectedIndex !== null && `${selectedIndex + 1} / ${displayPhotos.length}`}
                        </div>

                        {/* Thumbnails */}
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 max-w-md overflow-x-auto p-2">
                            {displayPhotos.map((photo, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedIndex(index)}
                                    className={cn(
                                        "flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all",
                                        selectedIndex === index
                                            ? "border-white opacity-100"
                                            : "border-transparent opacity-50 hover:opacity-80"
                                    )}
                                >
                                    <img
                                        src={photo}
                                        alt={`Miniatura ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PhotoGallery;
