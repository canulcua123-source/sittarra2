import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/settings
 * Obtiene la configuración operativa del restaurante.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;

        const { data: restaurant, error } = await supabaseAdmin
            .from('restaurants')
            .select('settings, opening_hours, name, description, phone, address, holidays')
            .eq('id', restaurantId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                ...restaurant.settings,
                opening_hours: restaurant.opening_hours,
                name: restaurant.name,
                description: restaurant.description,
                phone: restaurant.phone,
                address: restaurant.address,
                holidays: restaurant.holidays || []
            }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: 'Error al cargar la configuración del negocio' });
    }
});

/**
 * PATCH /api/admin/settings
 * Actualiza parámetros operativos (depósitos, horarios, info básica) del restaurante.
 */
router.patch('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const {
            depositRequired,
            depositAmount,
            depositHours,
            reservationDuration,
            maxGuestsPerReservation,
            advanceBookingDays,
            opening_hours,
            name,
            description,
            phone,
            address
        } = req.body;

        const updates: any = {};
        const settings: any = {};

        // Mapeo selectivo de configuraciones para evitar sobreescritura accidental
        if (typeof depositRequired !== 'undefined') settings.depositRequired = depositRequired;
        if (typeof depositAmount !== 'undefined') settings.depositAmount = depositAmount;
        if (depositHours) settings.depositHours = depositHours;
        if (reservationDuration) settings.reservationDuration = reservationDuration;
        if (maxGuestsPerReservation) settings.maxGuestsPerReservation = maxGuestsPerReservation;
        if (advanceBookingDays) settings.advanceBookingDays = advanceBookingDays;

        if (Object.keys(settings).length > 0) {
            const { data: existing } = await supabaseAdmin
                .from('restaurants')
                .select('settings')
                .eq('id', restaurantId)
                .single();

            updates.settings = { ...(existing?.settings || {}), ...settings };
        }

        if (req.body.holidays) updates.holidays = req.body.holidays; // Allow updating holidays structure
        if (opening_hours) updates.opening_hours = opening_hours;
        if (name) updates.name = name;
        if (description) updates.description = description;
        if (phone) updates.phone = phone;
        if (address) updates.address = address;

        const { data, error } = await supabaseAdmin
            .from('restaurants')
            .update(updates)
            .eq('id', restaurantId)
            .select('settings, opening_hours, name, description, phone, address')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                ...data.settings,
                opening_hours: data.opening_hours,
                name: data.name,
                description: data.description,
                phone: data.phone,
                address: data.address
            },
            message: 'Configuración actualizada exitosamente'
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar la configuración' });
    }
});

export default router;
