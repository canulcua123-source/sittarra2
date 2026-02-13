
import { sendVerificationCode } from '../services/email';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
    console.log('🧪 Testing Email Service...');
    console.log('ENV VARS CHECK:');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'Set' : 'Missing');

    try {
        const result = await sendVerificationCode({
            to: process.env.SMTP_USER || 'test@example.com', // Send to self
            code: '123456'
        });

        console.log('Result:', result);
        if (result) {
            console.log('✅ Email sent successfully!');
        } else {
            console.log('❌ Email failed to send (Internal logic returned false).');
        }
    } catch (error) {
        console.error('❌ Exception during email test:', error);
    }
}

testEmail();
