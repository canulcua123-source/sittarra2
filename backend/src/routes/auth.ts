import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendVerificationCode, sendWelcomeEmail } from '../services/email.js';

const router = Router();



// ===========================================
// CUSTOMER AUTH
// ===========================================

// Customer Register
router.post('/customer/register', async (req: Request, res: Response) => {
    try {
        const { email, password, name, phone } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos obligatorios'
            });
        }

        // Check if user already exists in public.users
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'No se pudo completar el registro. Intente con otro correo o recupere su contraseña.'
            });
        }

        // Hash password (we'll store it in public.users for simplicity in this custom flow)
        // Note: In a production app with the schema provided, you'd use Supabase Auth.
        // But to make it work with the current backend-only flow, we'll ensure the table has what it needs.
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const { data: newUser, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                id: crypto.randomUUID(), // Using a random UUID since we're not using Supabase Auth yet
                name,
                email: email.toLowerCase(),
                phone: phone || '',
                password_hash: passwordHash, // We assume this column is added or we'll skip the hash if not
                role: 'customer',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('*')
            .single();

        if (userError) {
            console.error('Error creating customer:', userError);
            return res.status(500).json({
                success: false,
                error: 'Error al crear la cuenta: ' + userError.message
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email, role: newUser.role },
            env.jwtSecret,
            { expiresIn: '1d' }
        );

        // Send Welcome email and Verification code
        try {
            await sendWelcomeEmail(newUser.email, process.env.RESTAURANT_NAME || 'Mesa Feliz');

            // Generate and send verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            await supabaseAdmin.from('users').update({ verification_code: verificationCode }).eq('id', newUser.id);
            await sendVerificationCode({ to: newUser.email, code: verificationCode });
        } catch (emailError) {
            console.error('Error sending secondary registration emails:', emailError);
        }

        res.status(201).json({
            success: true,
            data: {
                user: {
                    ...newUser,
                    avatar: newUser.avatar_url
                },
                token
            }
        });

    } catch (error) {
        console.error('Customer registration error:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// Customer Login
router.post('/customer/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .limit(1)
            .single();

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash || '');
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            env.jwtSecret,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    avatar: user.avatar_url
                },
                token
            }
        });

    } catch (error) {
        console.error('Customer login error:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// ===========================================
// RESTAURANT AUTH
// ===========================================

// Restaurant Register
router.post('/restaurant/register', async (req: Request, res: Response) => {
    try {
        const { owner_name, email, phone, password, restaurant: restData } = req.body;

        if (!email || !password || !owner_name || !restData?.name) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos obligatorios'
            });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        let userId = '';
        let userToReturn = null;

        if (existingUser) {
            // 1a. User exists -> Verify password to allow 'Upgrade'
            const validPassword = await bcrypt.compare(password, existingUser.password_hash || '');

            if (!validPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Este correo ya está registrado y la contraseña no coincide'
                });
            }

            userId = existingUser.id;

            // Upgrade role if needed (customer -> restaurant_admin)
            if (existingUser.role === 'customer') {
                const { error: updateError } = await supabaseAdmin
                    .from('users')
                    .update({ role: 'restaurant_admin' })
                    .eq('id', userId);

                if (updateError) throw updateError;
                existingUser.role = 'restaurant_admin';
            }

            userToReturn = existingUser;

        } else {
            // 1b. Create New User
            userId = crypto.randomUUID();
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const { data: newUser, error: userError } = await supabaseAdmin
                .from('users')
                .insert({
                    id: userId,
                    name: owner_name,
                    email: email.toLowerCase(),
                    phone: phone || '',
                    password_hash: passwordHash,
                    role: 'restaurant_admin',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (userError) throw userError;
            userToReturn = newUser;
        }

        // 2. Create Restaurant
        const { data: restaurant, error: restError } = await supabaseAdmin
            .from('restaurants')
            .insert({
                id: crypto.randomUUID(),
                owner_id: userId,
                name: restData.name,
                description: restData.description || '',
                address: restData.address || '',
                zone: restData.zone || '',
                cuisine_type: restData.cuisine || '',
                price_range: restData.price_range || '$$',
                image_url: restData.image || '',
                open_time: restData.open_time || '09:00',
                close_time: restData.close_time || '22:00',
                settings: {
                    depositRequired: false,
                    depositAmount: 0,
                    depositHours: 24,
                    reservationDuration: 120,
                    maxGuestsPerReservation: 10,
                    advanceBookingDays: 30
                },
                opening_hours: {
                    monday: { open: '09:00', close: '22:00', closed: false },
                    tuesday: { open: '09:00', close: '22:00', closed: false },
                    wednesday: { open: '09:00', close: '22:00', closed: false },
                    thursday: { open: '09:00', close: '22:00', closed: false },
                    friday: { open: '09:00', close: '23:00', closed: false },
                    saturday: { open: '09:00', close: '23:00', closed: false },
                    sunday: { open: '09:00', close: '21:00', closed: false }
                }
            })
            .select()
            .single();

        if (restError) {
            // Rollback user creation (optional but good)
            await supabaseAdmin.from('users').delete().eq('id', userId);
            throw restError;
        }

        // 3. SEEDING: Create default tables for the new restaurant
        // This ensures Dashboard logic (occupancy/capacity) doesn't break
        const defaultTables = [
            { restaurant_id: restaurant.id, name: 'Mesa 1', capacity: 2, status: 'available' },
            { restaurant_id: restaurant.id, name: 'Mesa 2', capacity: 2, status: 'available' },
            { restaurant_id: restaurant.id, name: 'Mesa 3', capacity: 4, status: 'available' },
            { restaurant_id: restaurant.id, name: 'Mesa 4', capacity: 4, status: 'available' },
            { restaurant_id: restaurant.id, name: 'Mesa 5', capacity: 6, status: 'available' }
        ];

        const { error: tablesError } = await supabaseAdmin
            .from('tables')
            .insert(defaultTables);

        if (tablesError) {
            console.error('Initial seeding failed but restaurant was created:', tablesError);
        }

        // Generate Token
        const token = jwt.sign(
            { userId: userToReturn.id, restaurantId: restaurant.id, email: userToReturn.email, role: userToReturn.role },
            env.jwtSecret,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            success: true,
            data: {
                user: userToReturn,
                restaurant,
                token
            }
        });

    } catch (error: any) {
        console.error('Restaurant registration error:', error);
        res.status(500).json({ success: false, error: error.message || 'Error al registrar el restaurante' });
    }
});

router.post('/restaurant/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email y contraseña son requeridos'
            });
        }

        // Check if user already exists
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .limit(1)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Verify if it's a restaurant admin
        if (user.role !== 'restaurant_admin' && user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos de administrador'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash || '');

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Get the restaurant owned by this user
        const { data: restaurant } = await supabaseAdmin
            .from('restaurants')
            .select('*')
            .eq('owner_id', user.id)
            .single();

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                restaurantId: restaurant?.id,
                email: user.email,
                role: user.role
            },
            env.jwtSecret,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar_url
                },
                restaurant: restaurant,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ===========================================
// VERIFY TOKEN
// ===========================================
router.get('/verify', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token no proporcionado'
            });
        }

        const token = authHeader.split(' ')[1];

        // Decoded token might have different structures depending on source
        const decoded = jwt.verify(token, env.jwtSecret) as any;
        const userId = decoded.userId || decoded.id;

        // Get user profile from our users table
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido'
            });
        }

        // If it's a restaurant admin, also fetch their restaurant
        let restaurant = null;
        if (user.role === 'restaurant_admin' || user.role === 'super_admin') {
            const { data: restData } = await supabase
                .from('restaurants')
                .select('*')
                .eq('owner_id', user.id)
                .single();
            restaurant = restData;
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    avatar: user.avatar_url
                },
                restaurant
            }
        });

    } catch (error) {
        console.error('Verify token error:', error);
        res.status(401).json({
            success: false,
            error: 'Token inválido o expirado'
        });
    }
});

// ===========================================
// UPDATE PROFILE
// ===========================================
router.patch('/profile', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'No autorizado' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.jwtSecret) as any;
        const userId = decoded.userId || decoded.id;

        const { name, phone, avatar_url } = req.body;

        // STRICT WHITELISTING: Only allowed fields can be updated
        // This prevents mass assignment where a user could try to set "role: 'admin'"
        const updates: any = {};
        if (name) updates.name = String(name);
        if (phone) updates.phone = String(phone);
        if (avatar_url) updates.avatar_url = String(avatar_url);

        updates.updated_at = new Date().toISOString();

        if (Object.keys(updates).length <= 1) { // Only updated_at
            return res.status(400).json({ success: false, error: 'No se proporcionan campos válidos para actualizar' });
        }

        const { data: updatedUser, error } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select('*')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                avatar: updatedUser.avatar_url
            },
            message: 'Perfil actualizado correctamente'
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar el perfil' });
    }
});


// ===========================================
// PASSWORD RECOVERY
// ===========================================

// Forgot Password - Request reset link
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email es requerido' });
        }

        // Check if user exists
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id, email, name')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            // Return success even if user not found for security (prevent email enumeration)
            return res.json({
                success: true,
                message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date();
        resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry

        // Save token to user record
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                reset_token: resetToken,
                reset_token_expires: resetTokenExpires.toISOString()
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Send email
        await sendPasswordResetEmail({ to: user.email, token: resetToken });

        res.json({
            success: true,
            message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Error al procesar la solicitud' });
    }
});

// Reset Password - Complete reset using token
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, error: 'Token y nueva contraseña son requeridos' });
        }

        // Find user with valid token
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('reset_token', token)
            .gt('reset_token_expires', new Date().toISOString())
            .single();

        if (error || !user) {
            return res.status(400).json({ success: false, error: 'Token inválido o expirado' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset token
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                password_hash: passwordHash,
                reset_token: null,
                reset_token_expires: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        res.json({ success: true, message: 'Contraseña restablecida correctamente' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Error al restablecer la contraseña' });
    }
});

// ===========================================
// EMAIL VERIFICATION
// ===========================================

// Request Verification Code
router.post('/verification/request', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email es requerido' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const { error } = await supabaseAdmin
            .from('users')
            .update({ verification_code: verificationCode })
            .eq('email', email.toLowerCase());

        if (error) throw error;

        await sendVerificationCode({ to: email, code: verificationCode });

        res.json({ success: true, message: 'Código de verificación enviado' });

    } catch (error) {
        console.error('Verification request error:', error);
        res.status(500).json({ success: false, error: 'Error al enviar código' });
    }
});

// Verify Email Code
router.post('/verification/verify', async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, error: 'Email y código son requeridos' });
        }

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id, verification_code')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user || user.verification_code !== code) {
            return res.status(400).json({ success: false, error: 'Código inválido' });
        }

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                is_verified: true,
                verification_code: null
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        res.json({ success: true, message: 'Email verificado correctamente' });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ success: false, error: 'Error al verificar email' });
    }
});

export default router;
