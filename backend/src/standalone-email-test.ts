
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testStandalone() {
    console.log('🧪 Testing Standalone Email...');

    const GMAIL_USER = process.env.GMAIL_USER;
    const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
    const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

    console.log('User:', GMAIL_USER);
    console.log('ClientID exists:', !!CLIENT_ID);
    console.log('RefreshToken exists:', !!REFRESH_TOKEN);

    if (!GMAIL_USER || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        console.error('❌ Missing credentials in .env');
        return;
    }

    try {
        console.log('🔄 Getting Access Token...');
        const OAuth2 = google.auth.OAuth2;
        const oauth2Client = new OAuth2(
            CLIENT_ID,
            CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: REFRESH_TOKEN
        });

        const accessToken = await oauth2Client.getAccessToken();
        console.log('✅ Access Token obtained:', accessToken.token ? 'Yes' : 'No');

        console.log('🔄 Creating Transporter...');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: GMAIL_USER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token as string,
            },
        });

        console.log('🔄 Sending Test Email...');
        const info = await transporter.sendMail({
            from: `Mesa Feliz Test <${GMAIL_USER}>`,
            to: GMAIL_USER, // Send to self
            subject: 'Test Email from Debugger',
            text: 'If you see this, the configuration is correct!'
        });

        console.log('✅ Email sent: ', info.messageId);

    } catch (error) {
        console.error('❌ ERROR详情:', error);
    }
}

testStandalone();
