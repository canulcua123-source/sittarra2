import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, restaurantOwnerMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/offers
 * Obtiene todas las ofertas activas de todos los restaurantes (Vista Global).
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: offers, error } = await supabase
            .from('offers')
            .select(`
                *,
                restaurants (id, name, image_url, cuisine_type, zone)
            `)
            .eq('is_active', true)
            .gte('valid_until', today)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching global offers:', error);
            res.status(500).json({ success: false, error: 'Error al obtener ofertas globales' });
            return;
        }

        res.json({ success: true, data: offers });
    } catch (error) {
        console.error('Global offers route error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/offers/restaurants/:restaurantId
 * Obtiene las ofertas activas de un restaurante específico (Vista Pública).
 */
router.get('/restaurants/:restaurantId', async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const { data: offers, error } = await supabase
            .from('offers')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .gte('valid_until', today)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching restaurant offers:', error);
            res.status(500).json({ success: false, error: 'Error al obtener ofertas del restaurante' });
            return;
        }

        res.json({ success: true, data: offers || [] });
    } catch (error) {
        console.error('Restaurant offers route error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/offers/restaurants/:restaurantId
 * Crea una nueva oferta promocional para un restaurante.
 * Requiere autenticación y ser dueño del restaurante.
 */
router.post('/restaurants/:restaurantId', authMiddleware, restaurantOwnerMiddleware('restaurantId'), async (req: Request, res: Response) => {
    console.log('[OFFERS DEBUG] POST Request received for restaurant:', req.params.restaurantId);
    console.log('[OFFERS DEBUG] Body:', JSON.stringify(req.body, null, 2));
    try {
        const { restaurantId } = req.params;
        const {
            title,
            description,
            discount,
            discountType,
            validFrom,
            validUntil
        } = req.body;

        // Validación de campos requeridos
        if (!title || !description || !discount) {
            res.status(400).json({
                success: false,
                error: 'Título, descripción y descuento son requeridos'
            });
            return;
        }

        // Calcular fecha de fin por defecto (1 año) si no se proporciona
        const defaultValidUntil = new Date();
        defaultValidUntil.setFullYear(defaultValidUntil.getFullYear() + 1);
        const validUntilValue = validUntil || defaultValidUntil.toISOString().split('T')[0];

        const { data, error } = await supabaseAdmin
            .from('offers')
            .insert({
                restaurant_id: restaurantId,
                title,
                description,
                discount_type: discountType || 'percentage',
                discount_value: discount,
                valid_from: validFrom || new Date().toISOString().split('T')[0],
                valid_until: validUntilValue,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('[OFFERS DEBUG] Error creating offer in Supabase:', error);
            res.status(500).json({ success: false, error: 'Error al crear la oferta', details: error.message });
            return;
        }

        console.log('[OFFERS DEBUG] Offer created successfully:', data.id);

        res.status(201).json({
            success: true,
            data,
            message: 'Oferta creada exitosamente'
        });
    } catch (error) {
        console.error('Create offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * PATCH /api/offers/:offerId
 * Actualiza una oferta existente.
 * Requiere autenticación.
 */
router.patch('/:offerId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { offerId } = req.params;
        const {
            title,
            description,
            discount,
            discountType,
            validFrom,
            validUntil,
            is_active,
            isActive
        } = req.body;

        // Verificar que la oferta pertenece al restaurante del usuario
        const userId = (req as any).user?.id;

        const { data: offer, error: offerError } = await supabaseAdmin
            .from('offers')
            .select('restaurant_id')
            .eq('id', offerId)
            .single();

        if (offerError || !offer) {
            res.status(404).json({ success: false, error: 'Oferta no encontrada' });
            return;
        }

        // Verificar propiedad del restaurante
        const { data: restaurant, error: restaurantError } = await supabaseAdmin
            .from('restaurants')
            .select('owner_id')
            .eq('id', offer.restaurant_id)
            .single();

        if (restaurantError || !restaurant || restaurant.owner_id !== userId) {
            res.status(403).json({
                success: false,
                error: 'No tienes permiso para modificar esta oferta'
            });
            return;
        }

        // Construir objeto de actualización
        const updates: Record<string, any> = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (discount !== undefined) updates.discount_value = discount;
        if (discountType !== undefined) updates.discount_type = discountType;
        if (validFrom !== undefined) updates.valid_from = validFrom;
        if (validUntil !== undefined) updates.valid_until = validUntil;
        if (is_active !== undefined) updates.is_active = is_active;
        if (isActive !== undefined) updates.is_active = isActive;

        const { data, error } = await supabaseAdmin
            .from('offers')
            .update(updates)
            .eq('id', offerId)
            .select()
            .single();

        if (error) {
            console.error('Error updating offer:', error);
            res.status(500).json({ success: false, error: 'Error al actualizar la oferta' });
            return;
        }

        res.json({
            success: true,
            data,
            message: 'Oferta actualizada exitosamente'
        });
    } catch (error) {
        console.error('Update offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * DELETE /api/offers/:offerId
 * Elimina permanentemente una oferta.
 * Requiere autenticación.
 */
router.delete('/:offerId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { offerId } = req.params;
        const userId = (req as any).user?.id;

        // Verificar que la oferta pertenece al restaurante del usuario
        const { data: offer, error: offerError } = await supabaseAdmin
            .from('offers')
            .select('restaurant_id')
            .eq('id', offerId)
            .single();

        if (offerError || !offer) {
            res.status(404).json({ success: false, error: 'Oferta no encontrada' });
            return;
        }

        // Verificar propiedad del restaurante
        const { data: restaurant, error: restaurantError } = await supabaseAdmin
            .from('restaurants')
            .select('owner_id')
            .eq('id', offer.restaurant_id)
            .single();

        if (restaurantError || !restaurant || restaurant.owner_id !== userId) {
            res.status(403).json({
                success: false,
                error: 'No tienes permiso para eliminar esta oferta'
            });
            return;
        }

        const { error } = await supabaseAdmin
            .from('offers')
            .delete()
            .eq('id', offerId);

        if (error) {
            console.error('Error deleting offer:', error);
            res.status(500).json({ success: false, error: 'Error al eliminar la oferta' });
            return;
        }

        res.json({
            success: true,
            message: 'Oferta eliminada correctamente'
        });
    } catch (error) {
        console.error('Delete offer error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/offers/validate
 * Valida un código promocional o una oferta para un usuario y condiciones específicas.
 */
router.post('/validate', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { offerId, promoCode, guestCount, date, time } = req.body;
        const userId = req.user!.id;

        // 1. Buscar la oferta por ID o Código
        let query = supabaseAdmin.from('offers').select('*').eq('is_active', true);

        if (offerId) {
            query = query.eq('id', offerId);
        } else if (promoCode) {
            query = query.eq('promo_code', promoCode.toUpperCase());
        } else {
            return res.status(400).json({ success: false, error: 'offerId o promoCode es requerido' });
        }

        const { data: offer, error } = await query.maybeSingle();

        if (error || !offer) {
            return res.status(404).json({ success: false, error: 'Promoción no válida o expirada' });
        }

        // 2. Validaciones de Reglas
        const now = new Date();
        const checkDate = date ? new Date(date) : now;
        const dayOfWeek = checkDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        // Regla: Fechas
        if (new Date(offer.valid_from) > checkDate || new Date(offer.valid_until) < checkDate) {
            return res.status(400).json({ success: false, error: 'Esta promoción no está vigente para la fecha seleccionada' });
        }

        // Regla: Días de la semana
        if (offer.valid_days && !offer.valid_days.includes(dayOfWeek)) {
            return res.status(400).json({ success: false, error: `Esta oferta solo es válida los días: ${offer.valid_days.join(', ')}` });
        }

        // Regla: Capacidad (Party Size)
        if (guestCount) {
            if (offer.min_party_size && guestCount < offer.min_party_size) {
                return res.status(400).json({ success: false, error: `Esta oferta requiere un mínimo de ${offer.min_party_size} personas` });
            }
            if (offer.max_party_size && guestCount > offer.max_party_size) {
                return res.status(400).json({ success: false, error: `Esta oferta es válida para un máximo de ${offer.max_party_size} personas` });
            }
        }

        // Regla: Límite de uso global
        if (offer.max_usage && offer.usage_count >= offer.max_usage) {
            return res.status(400).json({ success: false, error: 'Esta promoción ha agotado su límite de usos' });
        }

        // Regla: Uso por usuario (Redenciones previas)
        const { count: redemptionCount } = await supabaseAdmin
            .from('offer_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('offer_id', offer.id)
            .eq('user_id', userId);

        if (redemptionCount && redemptionCount >= 1) { // Por defecto 1 uso por usuario para Fase 5
            return res.status(400).json({ success: false, error: 'Ya has utilizado esta promoción anteriormente' });
        }

        res.json({
            success: true,
            data: offer,
            message: 'Promoción válida'
        });
    } catch (error) {
        console.error('Validate offer error:', error);
        res.status(500).json({ success: false, error: 'Error al validar la oferta' });
    }
});

/**
 * POST /api/offers/redeem
 * Registra el uso de una oferta vinculada a una reservación.
 */
router.post('/redeem', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { offerId, reservationId, discountApplied } = req.body;
        const userId = req.user!.id;

        if (!offerId || !reservationId) {
            return res.status(400).json({ success: false, error: 'offerId y reservationId son requeridos' });
        }

        // 1. Registrar la redención
        const { error: redemptionError } = await supabaseAdmin
            .from('offer_redemptions')
            .insert({
                offer_id: offerId,
                user_id: userId,
                reservation_id: reservationId,
                discount_applied: discountApplied || 0
            });

        if (redemptionError) throw redemptionError;

        // 2. Incrementar contador de uso en la oferta
        const { error: updateError } = await supabaseAdmin.rpc('increment_offer_usage', {
            offer_id: offerId
        });

        if (updateError) {
            // Si la función RPC no existe, usamos update manual (menos atómico pero funciona)
            console.warn('RPC increment_offer_usage failing, falling back to manual update');
            const { data: currentOffer } = await supabaseAdmin.from('offers').select('usage_count').eq('id', offerId).single();
            await supabaseAdmin.from('offers').update({ usage_count: (currentOffer?.usage_count || 0) + 1 }).eq('id', offerId);
        }

        res.json({
            success: true,
            message: 'Oferta canjeada exitosamente'
        });
    } catch (error) {
        console.error('Redeem offer error:', error);
        res.status(500).json({ success: false, error: 'Error al canjear la oferta' });
    }
});

export default router;
