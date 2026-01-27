import { Router, Request, Response } from 'express';
import { sendVerificationCode } from '../services/email.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

/**
 * POST /api/verification/send-code
 * Send a verification code to the provided email
 */
router.post('/send-code', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Store code in DB with 10-minute expiration
        const { error: dbError } = await supabaseAdmin
            .from('verification_codes')
            .upsert({
                email: email.toLowerCase(),
                code,
                expires_at: expiresAt,
                attempts: 0
            }, { onConflict: 'email' }); // Assuming email is unique or we handle cleanup

        if (dbError) throw dbError;

        console.log(`📧 Verification code for ${email}: ${code}`);

        // Send real email
        const result = await sendVerificationCode({ to: email, code });

        if (result.success) {
            res.json({
                success: true,
                message: 'Código de verificación enviado a tu correo'
            });
        } else {
            res.status(500).json({
                success: false,
                error: `No se pudo enviar el correo: ${result.error?.message || 'Error desconocido'}`
            });
        }

    } catch (error) {
        console.error('Error sending verification code:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar el código de verificación'
        });
    }
});

/**
 * POST /api/verification/verify-code
 * Verify the code entered by the user
 */
router.post('/verify-code', async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                error: 'Email y código son requeridos'
            });
        }

        // Fetch code from DB
        const { data: stored, error } = await supabaseAdmin
            .from('verification_codes')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !stored) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró código de verificación. Solicita uno nuevo.'
            });
        }

        // Check if expired
        if (new Date(stored.expires_at) < new Date()) {
            await supabaseAdmin.from('verification_codes').delete().eq('email', email.toLowerCase());
            return res.status(400).json({
                success: false,
                error: 'El código ha expirado. Solicita uno nuevo.'
            });
        }

        // Check attempts (max 5)
        if (stored.attempts >= 5) {
            await supabaseAdmin.from('verification_codes').delete().eq('email', email.toLowerCase());
            return res.status(400).json({
                success: false,
                error: 'Demasiados intentos. Solicita un nuevo código.'
            });
        }

        // Verify code
        if (stored.code !== code) {
            await supabaseAdmin
                .from('verification_codes')
                .update({ attempts: stored.attempts + 1 })
                .eq('email', email.toLowerCase());

            return res.status(400).json({
                success: false,
                error: 'Código incorrecto',
                attemptsRemaining: 5 - (stored.attempts + 1)
            });
        }

        // Success - delete the code and update user if exists
        await supabaseAdmin.from('verification_codes').delete().eq('email', email.toLowerCase());

        await supabaseAdmin
            .from('users')
            .update({ is_verified: true })
            .eq('email', email.toLowerCase());

        res.json({
            success: true,
            verified: true,
            message: 'Correo verificado correctamente'
        });

    } catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).json({
            success: false,
            error: 'Error al verificar el código'
        });
    }
});

/**
 * POST /api/verification/resend-code
 * Resend verification code
 */
router.post('/resend-code', async (req: Request, res: Response) => {
    // Re-use logic from send-code via a redirect or just duplicate for simplicity in this flow
    // or better yet, refactor send-code logic into a helper function (outside scope of quick fix but recommended)
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabaseAdmin
            .from('verification_codes')
            .upsert({
                email: email.toLowerCase(),
                code,
                expires_at: expiresAt,
                attempts: 0
            }, { onConflict: 'email' });

        const result = await sendVerificationCode({ to: email, code });

        res.json({
            success: true,
            message: result.success ? 'Nuevo código enviado a tu correo' : 'Código generado (Error al enviar email)',
            error: result.error
        });

    } catch (error) {
        console.error('Error resending verification code:', error);
        res.status(500).json({
            success: false,
            error: 'Error al reenviar el código'
        });
    }
});

export default router;
