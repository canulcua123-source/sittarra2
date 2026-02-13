import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/geocode/search
 * Proxy for OpenStreetMap Nominatim API to avoid CORS issues
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Query parameter "q" is required'
            });
        }

        // Add Yucatan, Mexico context to the search
        const searchQuery = `${q}, Yucatán, México`;

        console.log(`🔍 Geocode search: ${searchQuery}`);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchQuery)}&` +
                `format=json&addressdetails=1&limit=5&countrycodes=mx`,
                {
                    headers: {
                        'Accept-Language': 'es',
                        'User-Agent': 'MesaFeliz-RestaurantBooking/1.0 (contact@mesafeliz.com)'
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('Nominatim API error:', response.status, response.statusText);
                return res.status(response.status).json({
                    success: false,
                    error: 'Error en el servicio de geocodificación'
                });
            }

            const data = await response.json() as unknown[];
            console.log(`📍 Found ${data.length} results`);
            res.json(data);
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.error('Nominatim request timed out');
                return res.status(504).json({
                    success: false,
                    error: 'Timeout al buscar direcciones'
                });
            }
            throw fetchError;
        }

    } catch (error: any) {
        console.error('Error in geocode proxy:', error.message || error);
        res.status(500).json({
            success: false,
            error: 'Error al buscar direcciones',
            details: error.message || 'Unknown error'
        });
    }
});

/**
 * GET /api/geocode/reverse
 * Reverse geocoding - get address from coordinates
 */
router.get('/reverse', async (req: Request, res: Response) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                success: false,
                error: 'Parameters "lat" and "lon" are required'
            });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?` +
                `lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'es',
                        'User-Agent': 'MesaFeliz-RestaurantBooking/1.0 (contact@mesafeliz.com)'
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                return res.status(response.status).json({
                    success: false,
                    error: 'Error en el servicio de geocodificación'
                });
            }

            const data = await response.json();
            res.json(data);
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                return res.status(504).json({
                    success: false,
                    error: 'Timeout al obtener dirección'
                });
            }
            throw fetchError;
        }

    } catch (error: any) {
        console.error('Error in reverse geocode:', error.message || error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener dirección'
        });
    }
});

export default router;
