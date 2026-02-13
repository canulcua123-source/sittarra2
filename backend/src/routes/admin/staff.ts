import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { DEFAULT_PERMISSIONS } from '../../constants/roles.js';
import crypto from 'node:crypto';

const router = Router();

/**
 * GET /api/admin/staff
 * Obtiene la lista del personal asignado al restaurante con sus respectivos perfiles.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;

        const { data, error } = await supabaseAdmin
            .from('restaurant_staff')
            .select(`
                *,
                users:user_id (id, name, email, phone, avatar_url)
            `)
            .eq('restaurant_id', restaurantId);

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Staff list error:', error);
        res.status(500).json({ success: false, error: 'Error al cargar el personal del restaurante' });
    }
});

/**
 * POST /api/admin/staff
 * Crea un nuevo miembro del staff y lo vincula al restaurante.
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const { email, name, phone, role, permissions } = req.body;

        const bcrypt = await import('bcryptjs');
        const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 characters random hex
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // Registro de usuario base
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                email,
                name,
                phone,
                role: 'staff',
                password_hash: passwordHash
            })
            .select()
            .single();

        if (userError) throw userError;

        // Vínculo con el restaurante
        const staffRole = role || 'waiter';
        const { data: staffRecord, error: staffError } = await supabaseAdmin
            .from('restaurant_staff')
            .insert({
                restaurant_id: restaurantId,
                user_id: user.id,
                staff_role: staffRole,
                permissions: permissions || DEFAULT_PERMISSIONS[staffRole as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.waiter
            })
            .select()
            .single();

        if (staffError) throw staffError;

        res.status(201).json({
            success: true,
            data: { ...staffRecord, user },
            message: `Miembro del staff registrado exitosamente. Contraseña temporal: ${tempPassword}`
        });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ success: false, error: 'Error al dar de alta al miembro del staff' });
    }
});

/**
 * PATCH /api/admin/staff/:id
 * Actualiza permisos, rol o estado de activación de un miembro del staff.
 */
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;
        const { staff_role, permissions, is_active } = req.body;

        const updates: any = {};
        if (staff_role) updates.staff_role = staff_role;
        if (permissions) updates.permissions = permissions;
        if (typeof is_active === 'boolean') updates.is_active = is_active;

        const { data, error } = await supabaseAdmin
            .from('restaurant_staff')
            .update(updates)
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .select(`
                *,
                users:user_id (id, name, email, phone, avatar_url)
            `)
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Información de staff actualizada' });
    } catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar al miembro del staff' });
    }
});

/**
 * DELETE /api/admin/staff/:id
 * Remueve la relación del miembro del staff con el restaurante.
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = (req as any).user?.restaurantId;

        const { error } = await supabaseAdmin
            .from('restaurant_staff')
            .delete()
            .eq('id', id)
            .eq('restaurant_id', restaurantId);

        if (error) throw error;
        res.json({ success: true, message: 'Miembro del staff desvinculado correctamente' });
    } catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({ success: false, error: 'Error al desvincular al miembro del staff' });
    }
});

export default router;
