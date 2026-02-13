import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

interface ImageUploadProps {
    value?: string; // Current image URL
    onChange: (url: string) => void;
    onError?: (error: string) => void;
    label?: string;
    maxSizeMB?: number;
    disabled?: boolean;
}

export const ImageUpload = ({
    value,
    onChange,
    onError,
    label = 'Imagen del restaurante',
    maxSizeMB = 5,
    disabled = false
}: ImageUploadProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            const error = 'Por favor selecciona un archivo de imagen';
            toast.error(error);
            onError?.(error);
            return;
        }

        // Validate file size
        const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
        if (file.size > maxSize) {
            const error = `La imagen debe ser menor a ${maxSizeMB}MB`;
            toast.error(error);
            onError?.(error);
            return;
        }

        // Show preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to server
        setIsUploading(true);
        try {
            // Get token from restaurant session
            const sessionData = localStorage.getItem('mesafeliz_restaurant_session');
            const session = JSON.parse(sessionData);
            let token = session.token;

            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    token = session.token;
                } catch (e) {
                    console.error('Error parsing session:', e);
                }
            }

            if (!token) {
                throw new Error('No se encontró token de autenticación. Por favor inicia sesión de nuevo.');
            }

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${API_BASE_URL}/upload/restaurant-main-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success && data.data?.url) {
                onChange(data.data.url);
                toast.success('Imagen subida exitosamente');
            } else {
                throw new Error(data.error || 'Error al subir imagen');
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            const errorMsg = error.message || 'Error al subir la imagen';
            toast.error(errorMsg);
            onError?.(errorMsg);
            setPreview(value || null); // Revert to original
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    {label}
                </label>
            )}

            <div className="space-y-3">
                {/* Preview or Upload Area */}
                {preview ? (
                    <div className="relative group rounded-xl overflow-hidden border-2 border-border">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                        />
                        {!disabled && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleClick}
                                    disabled={isUploading}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Cambiar
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleRemove}
                                    disabled={isUploading}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Eliminar
                                </Button>
                            </div>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleClick}
                        disabled={disabled || isUploading}
                        className="w-full h-48 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <span className="text-sm">Subiendo imagen...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8" />
                                <span className="text-sm font-medium">Click para subir imagen</span>
                                <span className="text-xs">JPG, PNG o WebP (máx. {maxSizeMB}MB)</span>
                            </>
                        )}
                    </button>
                )}

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled || isUploading}
                />
            </div>

            <p className="text-xs text-muted-foreground">
                Esta será la imagen principal de tu restaurante
            </p>
        </div>
    );
};

export default ImageUpload;
