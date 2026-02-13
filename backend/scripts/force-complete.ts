import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno manualmente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function completeReservation() {
    // ID obtenido del log de observación del usuario
    const RESERVATION_ID = '7b9ebcf9-98ed-4c2c-9ef5-2ebfae381b88';

    console.log(`Intentando completar reservación ${RESERVATION_ID}...`);

    const { data, error } = await supabaseAdmin
        .from('reservations')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', RESERVATION_ID)
        .select()
        .single();

    if (error) {
        console.error('Error al actualizar:', error);
    } else {
        console.log('¡Éxito! Reservación completada:', data);
    }
}

completeReservation();
