import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateAdmin, authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configurar multer para manejar uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, cb) => {
        // Solo permitir imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'));
        }
    }
});

/**
 * POST /api/upload/avatar
 * Subir foto de perfil de usuario (clientes)
 */
router.post('/avatar', authMiddleware, upload.single('image'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const userId = req.user!.id;

        if (!file) {
            res.status(400).json({ success: false, error: 'No se proporcionó ninguna imagen' });
            return;
        }

        // Generar nombre único para el archivo
        const fileExt = file.originalname.split('.').pop() || 'jpg';
        const fileName = `avatars/${userId}/${uuidv4()}.${fileExt}`;

        // Subir a Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from('images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading avatar to storage:', uploadError);
            res.status(500).json({ success: false, error: 'Error al subir imagen' });
            return;
        }

        // Obtener URL pública
        const { data: urlData } = supabaseAdmin.storage
            .from('images')
            .getPublicUrl(fileName);

        const avatarUrl = urlData.publicUrl;
        console.log('Generated Avatar URL:', avatarUrl);

        // Actualizar el avatar_url del usuario en la base de datos
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ avatar_url: avatarUrl })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user avatar:', updateError);
            res.status(500).json({ success: false, error: 'Error al actualizar perfil' });
            return;
        }

        res.json({
            success: true,
            data: {
                url: avatarUrl,
                path: fileName
            },
            message: 'Foto de perfil actualizada exitosamente'
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ success: false, error: 'Error al procesar imagen' });
    }
});

/**
 * POST /api/upload/menu-image
 * Subir imagen de platillo
 */
router.post('/menu-image', authenticateAdmin, upload.single('image'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const restaurantId = (req as any).user?.restaurantId;

        if (!file) {
            res.status(400).json({ success: false, error: 'No se proporcionó ninguna imagen' });
            return;
        }

        // Generar nombre único para el archivo
        const fileExt = file.originalname.split('.').pop();
        const fileName = `menu/${restaurantId}/${uuidv4()}.${fileExt}`;

        // Subir a Supabase Storage
        const { data, error } = await supabaseAdmin.storage
            .from('images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Error uploading to storage:', error);
            res.status(500).json({ success: false, error: 'Error al subir imagen' });
            return;
        }

        // Obtener URL pública
        const { data: urlData } = supabaseAdmin.storage
            .from('images')
            .getPublicUrl(fileName);

        res.json({
            success: true,
            data: {
                url: urlData.publicUrl,
                path: fileName
            },
            message: 'Imagen subida exitosamente'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Error al procesar imagen' });
    }
});

/**
 * POST /api/upload/restaurant-main-image
 * Subir imagen principal del restaurante
 */
router.post('/restaurant-main-image', authenticateAdmin, upload.single('image'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const restaurantId = (req as any).user?.restaurantId;

        if (!file) {
            res.status(400).json({ success: false, error: 'No se proporcionó ninguna imagen' });
            return;
        }

        const fileExt = file.originalname.split('.').pop();
        const fileName = `restaurants/${restaurantId}/main-${uuidv4()}.${fileExt}`;

        const { data, error } = await supabaseAdmin.storage
            .from('images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Error uploading:', error);
            res.status(500).json({ success: false, error: 'Error al subir imagen' });
            return;
        }

        const { data: urlData } = supabaseAdmin.storage
            .from('images')
            .getPublicUrl(fileName);

        // Actualizar la imagen principal del restaurante
        await supabaseAdmin
            .from('restaurants')
            .update({ image: urlData.publicUrl })
            .eq('id', restaurantId);

        res.json({
            success: true,
            data: {
                url: urlData.publicUrl,
                path: fileName
            },
            message: 'Imagen principal actualizada'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Error al procesar imagen' });
    }
});

/**
 * POST /api/upload/restaurant-photo
 * Subir foto del restaurante (galería)
 */
router.post('/restaurant-photo', authenticateAdmin, upload.single('image'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const restaurantId = (req as any).user?.restaurantId;

        if (!file) {
            res.status(400).json({ success: false, error: 'No se proporcionó ninguna imagen' });
            return;
        }

        const fileExt = file.originalname.split('.').pop();
        const fileName = `restaurants/${restaurantId}/${uuidv4()}.${fileExt}`;

        const { data, error } = await supabaseAdmin.storage
            .from('images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Error uploading:', error);
            res.status(500).json({ success: false, error: 'Error al subir imagen' });
            return;
        }

        const { data: urlData } = supabaseAdmin.storage
            .from('images')
            .getPublicUrl(fileName);

        // Agregar a la galería del restaurante
        const { data: restaurant } = await supabaseAdmin
            .from('restaurants')
            .select('photos')
            .eq('id', restaurantId)
            .single();

        const currentPhotos = restaurant?.photos || [];
        const updatedPhotos = [...currentPhotos, urlData.publicUrl];

        await supabaseAdmin
            .from('restaurants')
            .update({ photos: updatedPhotos })
            .eq('id', restaurantId);

        res.json({
            success: true,
            data: {
                url: urlData.publicUrl,
                path: fileName
            },
            message: 'Foto agregada a la galería'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Error al procesar imagen' });
    }
});

/**
 * DELETE /api/upload/image
 * Eliminar imagen del storage
 */
router.delete('/image', authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { path } = req.body;

        if (!path) {
            res.status(400).json({ success: false, error: 'Path requerido' });
            return;
        }

        const { error } = await supabaseAdmin.storage
            .from('images')
            .remove([path]);

        if (error) {
            console.error('Error deleting:', error);
            res.status(500).json({ success: false, error: 'Error al eliminar imagen' });
            return;
        }

        res.json({ success: true, message: 'Imagen eliminada' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar' });
    }
});

export default router;
