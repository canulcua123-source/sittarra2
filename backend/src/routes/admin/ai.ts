import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

/**
 * GET /api/admin/ai/suggestions
 * Genera sugerencias estratégicas mediante un motor híbrido (Reglas + IA Externa).
 */
router.get('/suggestions', async (req: Request, res: Response) => {
    try {
        const restaurantId = (req as any).user?.restaurantId;
        const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;

        // Recolección de contexto para el análisis
        const { data: recentReservations } = await supabaseAdmin
            .from('reservations')
            .select('date, time, guest_count, status')
            .eq('restaurant_id', restaurantId)
            .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .limit(100);

        const { data: reviews } = await supabaseAdmin
            .from('reviews')
            .select('rating, comment')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(10);

        const suggestions: any[] = [];
        const today = new Date().toISOString().split('T')[0];
        const todayReservations = recentReservations?.filter((r: any) => r.date === today && r.status !== 'cancelled') || [];

        // --- MOTOR DE REGLAS (Heurísticas locales) ---

        // Regla: Baja Ocupación
        if (todayReservations.length < 5) {
            suggestions.push({
                id: 'low-occupancy',
                category: 'marketing',
                title: 'Baja ocupación hoy',
                description: 'Detectamos pocas reservas para hoy. Sugerimos una promoción relámpago en redes sociales.',
                priority: 'alta',
                confidence: 90,
                estimatedImpact: '+15% reservas',
                actionLabel: 'Crear oferta',
                isApplied: false
            });
        }

        // Regla: No-Shows Reincidentes
        const noShowCount = recentReservations?.filter((r: any) => r.status === 'no_show').length || 0;
        if (noShowCount > 3) {
            suggestions.push({
                id: 'no-shows-alert',
                category: 'operacion',
                title: 'Tendencia de inasistencias',
                description: `Has tenido ${noShowCount} no-shows recientemente. Considera activar la política de anticipos obligatorios.`,
                priority: 'alta',
                confidence: 95,
                estimatedImpact: 'Reducir desperdicio',
                actionLabel: 'Activar depósitos',
                isApplied: false
            });
        }

        // --- MOTOR IA (Opcional si hay API Key) ---
        if (apiKey && suggestions.length < 3) {
            try {
                // Fetch nativo con timeout o controlador si fuera necesario
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-3.5-turbo",
                        messages: [
                            {
                                role: "system",
                                content: "Eres un consultor de restaurantes experto. Analiza los datos y provee 3 sugerencias en formato JSON: [{id, category, title, description, priority (high|medium|low), confidence, estimatedImpact, actionLabel}]. Categorías: marketing, operacion, quality. Devuelve SOLO JSON puro."
                            },
                            {
                                role: "user",
                                content: `Datos Reservas: ${JSON.stringify(recentReservations?.slice(0, 15))}. Opiniones: ${JSON.stringify(reviews)}. Genera insights únicos.`
                            }
                        ]
                    })
                });

                const json = await response.json() as any;
                if (json.choices?.[0]?.message?.content) {
                    const content = json.choices[0].message.content;
                    const aiContent = JSON.parse(content.replace(/```json/g, '').replace(/```/g, ''));
                    if (Array.isArray(aiContent)) {
                        aiContent.forEach(s => suggestions.push({ ...s, id: `ai-${s.id}`, isApplied: false }));
                    }
                }
            } catch (aiError) {
                console.warn('AI suggestions call failed, falling back to heuristics:', aiError);
            }
        }

        // Sugerencia genérica si el motor está vacío
        if (suggestions.length === 0) {
            suggestions.push({
                id: 'welcome-suggest',
                category: 'general',
                title: 'Optimizando el restaurante',
                description: 'Estamos recopilando datos de tus operaciones para ofrecerte consejos estratégicos. ¡Sigue adelante!',
                priority: 'baja',
                confidence: 100,
                estimatedImpact: 'N/A',
                actionLabel: 'Ir al Dashboard',
                isApplied: false
            });
        }

        res.json({ success: true, data: suggestions.slice(0, 5) });
    } catch (error) {
        console.error('AI suggestions error:', error);
        res.status(500).json({ success: false, error: 'Error al generar sugerencias de inteligencia' });
    }
});

export default router;
