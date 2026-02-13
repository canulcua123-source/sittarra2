import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
);

async function seedDashboard() {
    console.log('🌱 Sembrando datos para el Dashboard...');

    const restaurantId = '1'; // Ajustar según sea necesario
    const today = new Date().toISOString().split('T')[0];

    // 1. Crear algunas mesas si no existen
    const { data: tables } = await supabaseAdmin
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurantId);

    if (!tables || tables.length === 0) {
        console.log('Creando mesas...');
        await supabaseAdmin.from('tables').insert([
            { restaurant_id: restaurantId, number: 1, capacity: 4, status: 'occupied', x: 100, y: 100 },
            { restaurant_id: restaurantId, number: 2, capacity: 2, status: 'available', x: 200, y: 100 },
            { restaurant_id: restaurantId, number: 3, capacity: 6, status: 'occupied', x: 300, y: 100 },
        ]);
    } else {
        // Ocupar algunas mesas
        await supabaseAdmin.from('tables')
            .update({ status: 'occupied' })
            .eq('restaurant_id', restaurantId)
            .in('number', [1, 3]);
    }

    // 2. Crear reservaciones para hoy
    console.log('Creando reservaciones para hoy...');
    await supabaseAdmin.from('reservations').insert([
        {
            restaurant_id: restaurantId,
            customer_name: 'Juan Pérez',
            email: 'juan@example.com',
            phone: '9991234567',
            date: today,
            time: '19:00',
            guest_count: 4,
            status: 'confirmed',
            deposit_paid: true,
            deposit_amount: 200
        },
        {
            restaurant_id: restaurantId,
            customer_name: 'Maria Garcia',
            email: 'maria@example.com',
            phone: '9997654321',
            date: today,
            time: '20:30',
            guest_count: 2,
            status: 'pending',
            deposit_paid: false
        }
    ]);

    console.log('✅ Datos de Dashboard sembrados con éxito.');
}

seedDashboard().catch(console.error);
