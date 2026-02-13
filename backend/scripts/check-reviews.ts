import { supabaseAdmin } from '../src/config/supabase';

async function checkReviews() {
    console.log('--- REVISANDO RESERVACIONES Y RESEÑAS ---');

    const { data: reviews, error: revError } = await supabaseAdmin
        .from('reviews')
        .select('*')
        .limit(10);

    if (revError) {
        console.error('Error al obtener reseñas:', revError);
        return;
    }

    console.log(`Se encontraron ${reviews.length} reseñas.`);
    console.log(JSON.stringify(reviews, null, 2));

    const { data: res, error: resError } = await supabaseAdmin
        .from('reservations')
        .select('id, status, has_review')
        .eq('status', 'completed')
        .limit(10);

    if (resError) {
        console.error('Error al obtener reservaciones:', resError);
    } else {
        console.log('Reservaciones completadas recientes:');
        console.log(JSON.stringify(res, null, 2));
    }
}

checkReviews();
