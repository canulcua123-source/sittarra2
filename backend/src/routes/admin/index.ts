import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/auth.js';

// Imporing modular sub-routers
import dashboardRouter from './dashboard.js';
import reservationsRouter from './reservations.js';
import tablesRouter from './tables.js';
import waitlistRouter from './waitlist.js';
import offersRouter from './offers.js';
import menuRouter from './menu.js';
import reviewsRouter from './reviews.js';
import staffRouter from './staff.js';
import settingsRouter from './settings.js';
import aiRouter from './ai.js';
import reportsRouter from './reports.js';
import paymentsRouter from './payments.js';
import analyticsRouter from './analytics.js';
import configRouter from './config.js';

const router = Router();

/**
 * MESA FELIZ - MASTER ADMIN ROUTER
 * Este router centraliza todas las funciones de administración y aplica seguridad por defecto.
 * Estructura modular para facilitar el mantenimiento y la extensibilidad (AI-Ready).
 */

// Aplicar middleware de autenticación a todas las rutas hijas
router.use(authenticateAdmin);

// Montar sub-routers en sus respectivos prefijos
router.use('/dashboard', dashboardRouter);
router.use('/reservas', reservationsRouter);
router.use('/mesas', tablesRouter);
router.use('/waitlist', waitlistRouter);
router.use('/ofertas', offersRouter);
router.use('/menu', menuRouter);
router.use('/opiniones', reviewsRouter);
router.use('/usuarios', staffRouter);
router.use('/settings', settingsRouter);
router.use('/configuracion', settingsRouter); // Alias para compatibilidad
router.use('/ia', aiRouter);
router.use('/payments', paymentsRouter);
router.use('/analytics', analyticsRouter);
router.use('/reportes', reportsRouter);
router.use('/reports', reportsRouter); // Alias
router.use('/config', configRouter);
router.get('/ai-suggestions', (req, res) => res.redirect(307, './ia/suggestions')); // Redirección de compatibilidad
router.get('/ia-sugerencias', (req, res) => res.redirect(307, './ia/suggestions')); // Redirección adicional

// Compatibilidad con endpoints antiguos (si existieran fuera de sub-rutas dinámicas)
// Nota: La mayoría ya están cubiertos por los prefijos anteriores respetando la estructura original del frontend.

export default router;
