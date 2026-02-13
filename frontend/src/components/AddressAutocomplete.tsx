import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address: {
        road?: string;
        house_number?: string;
        suburb?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
    };
}

interface AddressAutocompleteProps {
    value: string;
    onChange: (address: string, details?: { lat: number; lon: number; zone?: string }) => void;
    placeholder?: string;
    className?: string;
    error?: boolean;
}

const AddressAutocomplete = ({
    value,
    onChange,
    placeholder = "Busca tu dirección...",
    className = "",
    error = false
}: AddressAutocompleteProps) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();

    // Sync external value
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchAddress = async (searchQuery: string) => {
        if (searchQuery.length < 3) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            // Use backend proxy to avoid CORS issues with Nominatim
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
            const response = await fetch(
                `${API_BASE_URL}/geocode/search?q=${encodeURIComponent(searchQuery)}`
            );
            const data: NominatimResult[] = await response.json();
            setResults(Array.isArray(data) ? data : []);
            setIsOpen(Array.isArray(data) && data.length > 0);
            setSelectedIndex(-1);
        } catch (error) {
            console.error('Error searching address:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setQuery(newValue);
        onChange(newValue); // Update parent immediately for validation

        // Debounce API calls (1 second to respect Nominatim rate limits)
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            searchAddress(newValue);
        }, 800);
    };

    const handleSelect = (result: NominatimResult) => {
        const address = result.display_name;

        // Try to extract zone from suburb or city
        const zone = result.address.suburb || result.address.city || '';

        setQuery(address);
        setIsOpen(false);
        setResults([]);

        onChange(address, {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            zone: zone
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    const clearInput = () => {
        setQuery('');
        onChange('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className={`pl-10 pr-10 ${error ? 'border-destructive' : ''} ${className}`}
                />
                {isLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                ) : query && (
                    <button
                        type="button"
                        onClick={clearInput}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {results.map((result, index) => (
                        <button
                            key={result.place_id}
                            type="button"
                            onClick={() => handleSelect(result)}
                            className={`w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors flex items-start gap-3 ${index === selectedIndex ? 'bg-muted' : ''
                                }`}
                        >
                            <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{result.display_name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* No results message */}
            {isOpen && results.length === 0 && query.length >= 3 && !isLoading && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-4 text-sm text-muted-foreground text-center">
                    No se encontraron resultados
                </div>
            )}
        </div>
    );
};

export default AddressAutocomplete;
