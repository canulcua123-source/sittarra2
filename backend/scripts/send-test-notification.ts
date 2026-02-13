import { supabaseAdmin } from '../src/config/supabase';

async function sendTest() {
    console.log('--- ENVIANDO NOTIFICACIÓN DE PRUEBA ---');

    // 1. Buscar al usuario más reciente que haya hecho una reserva
    const { data: latestRes, error: resError } = await supabaseAdmin
        .from('reservations')
        .select('user_id, restaurants(name)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (resError || !latestRes) {
        console.error('No se encontró ninguna reserva reciente para identificar a un usuario.', resError);
        return;
    }

    const userId = latestRes.user_id;
    const restaurantName = (latestRes.restaurants as any)?.name || 'Sittara Burger';

    console.log(`Usuario identificado: ${userId}`);

    // 2. Insertar notificación
    const { data: notif, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
            user_id: userId,
            type: 'promo',
            title: '🎁 ¡Regalo de Bienvenida!',
            message: `Gracias por tu reserva en ${restaurantName}. Presenta este aviso para una bebida de cortesía.`,
            data: { promoCode: 'WELCOME10' }
        })
        .select()
        .single();

    if (notifError) {
        console.error('Error al crear la notificación:', notifError);
    } else {
        console.log('✅ Notificación enviada con éxito!');
        console.log('Revisa tu app móvil en la sección de Notificaciones.');
    }
}

sendTest();
