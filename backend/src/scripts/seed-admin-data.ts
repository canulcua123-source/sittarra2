import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // Usaremos la service key para asegurar permisos
);

async function seed() {
    console.log('🌱 Iniciando sembrado de datos reales...');

    // 1. Obtener el ID del restaurante "los panipanos" o el primero disponible
    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name')
        .ilike('name', '%panipanos%');

    let restaurantId = restaurants?.[0]?.id;

    if (!restaurantId) {
        const { data: allRest } = await supabase.from('restaurants').select('id, name').limit(1);
        restaurantId = allRest?.[0]?.id;
    }

    if (!restaurantId) {
        console.error('❌ No se encontró ningún restaurante en la base de datos.');
        return;
    }

    console.log(`✅ Usando restaurante: ${restaurantId} (${restaurants?.[0]?.name || 'N/A'})`);

    const today = new Date().toISOString().split('T')[0];

    // 2. Crear algunas reservaciones para hoy
    console.log('📅 Creando reservaciones para hoy...');
    const { error: resError } = await supabase.from('reservations').insert([
        {
            restaurant_id: restaurantId,
            customer_name: 'Carlos Mendoza',
            email: 'carlos@example.com',
            phone: '9995551122',
            date: today,
            time: '14:30',
            guest_count: 3,
            status: 'confirmed',
            deposit_paid: true,
            deposit_amount: 150
        },
        {
            restaurant_id: restaurantId,
            customer_name: 'Ana López',
            email: 'ana@example.com',
            phone: '9994443322',
            date: today,
            time: '20:00',
            guest_count: 2,
            status: 'pending',
            deposit_paid: false
        }
    ]);

    if (resError) console.error('Error al insertar reservaciones:', resError);

    // 3. Crear algunas mesas y marcar ocupadas
    console.log('🪑 Configurando mesas...');
    const { data: existingTables } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurantId);

    if (!existingTables || existingTables.length === 0) {
        await supabase.from('tables').insert([
            { restaurant_id: restaurantId, number: 101, capacity: 4, status: 'occupied', x: 50, y: 50 },
            { restaurant_id: restaurantId, number: 102, capacity: 2, status: 'occupied', x: 150, y: 50 },
            { restaurant_id: restaurantId, number: 103, capacity: 6, status: 'available', x: 250, y: 50 },
        ]);
    } else {
        // Ocupar aleatoriamente
        await supabase.from('tables')
            .update({ status: 'occupied' })
            .eq('restaurant_id', restaurantId)
            .limit(2);
    }

    // 4. Crear un par de opiniones para el rating
    console.log('⭐ Agregando opiniones...');
    await supabase.from('reviews').insert([
        { restaurant_id: restaurantId, rating: 5, comment: 'Excelente comida!', customer_name: 'Juan Perez' },
        { restaurant_id: restaurantId, rating: 4, comment: 'Muy buen servicio.', customer_name: 'Maria G.' }
    ]);

    console.log('🎉 ¡Todo listo! Recarga el Dashboard.');
}

seed().catch(console.error);
