/**
 * Email Service
 * Handles sending emails for verification, reservations, and notifications.
 */
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

// Configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD; // Support App Password

// Gmail OAuth specific
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

let transporter: nodemailer.Transporter | null = null;

const createTransporter = async () => {
    if (transporter) return transporter;

    try {
        // Option 1: Gmail OAuth2 (If configured)
        if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && SMTP_USER) {
            const OAuth2 = google.auth.OAuth2;
            const oauth2Client = new OAuth2(
                GMAIL_CLIENT_ID,
                GMAIL_CLIENT_SECRET,
                "https://developers.google.com/oauthplayground"
            );

            oauth2Client.setCredentials({
                refresh_token: GMAIL_REFRESH_TOKEN
            });

            const accessToken = await oauth2Client.getAccessToken();

            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: SMTP_USER,
                    clientId: GMAIL_CLIENT_ID,
                    clientSecret: GMAIL_CLIENT_SECRET,
                    refreshToken: GMAIL_REFRESH_TOKEN,
                    accessToken: accessToken.token as string,
                },
            });
            console.log('📧 Email Service: Configured with Gmail OAuth2');
            return transporter;
        }

        // Option 2: Standard SMTP (Gmail App Password, SendGrid, Resend, etc.)
        if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
            transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: SMTP_PORT,
                secure: SMTP_PORT === 465, // true for 465, false for other ports
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
            });
            console.log(`📧 Email Service: Configured with SMTP (${SMTP_HOST})`);
            return transporter;
        }

        console.log('⚠️ Email Service: No credentials found. Emails will be logged to console (Dev Mode).');
        return null;
    } catch (error) {
        console.error('❌ Email Service Configuration Error:', error);
        return null;
    }
};

interface SendMailOptions {
    to: string;
    subject: string;
    html: string;
}

// Result type
interface EmailResult {
    success: boolean;
    error?: any;
}

const sendMail = async ({ to, subject, html }: SendMailOptions): Promise<EmailResult> => {
    try {
        const mailTransport = await createTransporter();

        if (!mailTransport) {
            // Dev Mode Fallback
            console.log(`\n════════════════ [EMAIL MOCK] ════════════════`);
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body (truncated): ${html.substring(0, 100)}...`);
            console.log(`══════════════════════════════════════════════\n`);
            return { success: true };
        }

        const info = await mailTransport.sendMail({
            from: `"${process.env.RESTAURANT_NAME || 'Mesa Feliz'}" <${SMTP_USER}>`,
            to,
            subject,
            html,
        });

        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return { success: true };
    } catch (error: any) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        return { success: false, error: error.message || error };
    }
};

// Public Methods

export async function sendVerificationCode({ to, code }: { to: string; code: string }): Promise<EmailResult> {
    const subject = `Tu código de verificación: ${code}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #e11d48;">Mesa Feliz</h2>
            <p>Hola,</p>
            <p>Usa el siguiente código para verificar tu cuenta:</p>
            <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${code}
            </div>
            <p>Este código expirará en 10 minutos.</p>
        </div>
    `;
    return sendMail({ to, subject, html });
}

export async function sendWelcomeEmail(to: string, restaurantName: string): Promise<EmailResult> {
    const subject = `¡Bienvenido a ${restaurantName}!`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Bienvenido a ${restaurantName}</h1>
            <p>Gracias por registrarte en nuestra plataforma.</p>
            <p>Ahora puedes realizar reservas de mesa de manera rápida y sencilla.</p>
            <a href="${process.env.FRONTEND_URL || '#'}" style="display: inline-block; background: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
                Ir al sitio
            </a>
        </div>
    `;
    return sendMail({ to, subject, html });
}

export async function sendReservationConfirmation(to: string, reservation: any): Promise<EmailResult> {
    const date = new Date(reservation.date).toLocaleDateString();
    const subject = `Reserva Confirmada - ${date}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #10b981;">¡Reserva Confirmada!</h2>
            <p>Tu reserva ha sido confirmada exitosamente.</p>
            <ul style="background: #f0fdf4; padding: 20px; border-radius: 8px; list-style: none;">
                <li><strong>Fecha:</strong> ${date}</li>
                <li><strong>Hora:</strong> ${reservation.time}</li>
                <li><strong>Personas:</strong> ${reservation.guestCount}</li>
                <li><strong>Mesa:</strong> ${reservation.tableId ? 'Asignada' : 'Pendiente de asignar'}</li>
            </ul>
            <p>Por favor, presenta este correo al llegar.</p>
        </div>
    `;
    return sendMail({ to, subject, html });
}

export async function sendPasswordResetEmail({ to, token }: { to: string; token: string }): Promise<EmailResult> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const subject = 'Restablecer tu contraseña - Mesa Feliz';
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #e11d48;">Mesa Feliz</h2>
            <p>Hola,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Restablecer Contraseña
                </a>
            </div>
            <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <p>Este enlace expirará en 1 hora.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                ${resetUrl}
            </p>
        </div>
    `;
    return sendMail({ to, subject, html });
}

export async function sendReservationCancellation(to: string, reservation: any): Promise<EmailResult> {
    const date = new Date(reservation.date).toLocaleDateString();
    const subject = `Reserva Cancelada - ${date}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #ef4444;">Reserva Cancelada</h2>
            <p>Tu reserva ha sido cancelada.</p>
            <ul style="background: #fef2f2; padding: 20px; border-radius: 8px; list-style: none;">
                <li><strong>Fecha:</strong> ${date}</li>
                <li><strong>Hora:</strong> ${reservation.time}</li>
                <li><strong>Personas:</strong> ${reservation.guest_count || reservation.guestCount}</li>
            </ul>
            ${reservation.deposit_paid ? '<p>Tu depósito será reembolsado automáticamente en los próximos días.</p>' : ''}
            <p>Esperamos verte pronto.</p>
        </div>
    `;
    return sendMail({ to, subject, html });
}
