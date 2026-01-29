import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env, isDevelopment } from './config/env.js';

// Import routes
import restaurantsRouter from './routes/restaurants.js';
import reservationsRouter from './routes/reservations.js';
import authRouter from './routes/auth.js';
import offersRouter from './routes/offers.js';
import reviewsRouter from './routes/reviews.js';
import staffRouter from './routes/staff.js';
import adminRouter from './routes/admin/index.js';
import uploadRouter from './routes/upload.js';
import verificationRouter from './routes/verification.js';
import geocodeRouter from './routes/geocode.js';
import paymentsRouter from './routes/payments.js';
import chatbotRouter from './routes/chatbot.js';
import favoritesRouter from './routes/favorites.js';
import notificationsRouter from './routes/notifications.js';
import menuCategoriesRouter from './routes/menu-categories.js';
import waitlistRouter from './routes/waitlist.js';

// Create Express app
const app = express();

// ===========================================
// MIDDLEWARE
// ===========================================

// Security headers
app.use(helmet());

// CORS configuration
// CORS configuration
// NOTE: We allow all origins ('*') initially to facilitate mobile app connection from various IPs.
// In a strict production environment, we should list specific domains or use a function to validate origins.
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Trust the first proxy (Render/Heroku/etc load balancers)
// This is required for correct IP rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMaxRequests,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (isDevelopment) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ===========================================
// ROUTES
// ===========================================

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Mesa Feliz API is running',
        timestamp: new Date().toISOString(),
        environment: env.nodeEnv,
    });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/restaurants', restaurantsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/chatbot', chatbotRouter);
// New endpoints
app.use('/api/favorites', favoritesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/menu-categories', menuCategoriesRouter);
app.use('/api/waitlist', waitlistRouter);

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
    });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);

    res.status(500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack }),
    });
});

// ===========================================
// START SERVER
// ===========================================

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(env.port, () => {
        console.log('');
        console.log('🍽️  ════════════════════════════════════════════');
        console.log('');
        console.log('   MESA FELIZ API (SITTARA)');
        console.log('   Restaurant Reservation System');
        console.log('');
        console.log(`   🚀 Server running on port ${env.port}`);
        console.log(`   📍 http://localhost:${env.port}`);
        console.log(`   🌍 Environment: ${env.nodeEnv}`);
        const key = env.supabaseServiceRoleKey;
        console.log(`   🔑 Service Role Key (starts with): ${key ? key.substring(0, 10) + '...' : 'MISSING'}`);
        console.log(`   🔑 Service Role Key (length): ${key ? key.length : 0}`);
        console.log('');
        console.log('   Available endpoints:');
        console.log('   • GET  /health');
        console.log('   • GET  /api/restaurants');
        console.log('   • GET  /api/restaurants/:id');
        console.log('   • POST /api/reservations');
        console.log('   • GET  /api/reservations/my');
        console.log('');
        console.log('═════════════════════════════════════════════════');
        console.log('');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
}

export default app;
