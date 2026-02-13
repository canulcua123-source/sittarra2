
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
);

async function seed() {
    console.log('🚀 Iniciando script de datos (V3 - Corregido ON CONFLICT)...');

    try {
        // 1. Crear Usuario Admin
        const email = 'admin@mesafeliz.com';
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Primero intentamos buscar si existe para evitar problemas de ON CONFLICT
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        let adminId = existingUser?.id;

        if (!adminId) {
            adminId = crypto.randomUUID();
            const { data: newUser, error: userError } = await supabase
                .from('users')
                .insert({
                    id: adminId,
                    email: email,
                    name: 'Administrador Demo',
                    role: 'restaurant_admin',
                    password_hash: passwordHash,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (userError) throw userError;
            console.log('✅ Usuario Administrador creado:', email);
        } else {
            console.log('✅ Usuario Administrador ya existe (ID preservado):', email);
        }

        // 2. Crear Restaurante
        const { data: existingRest } = await supabase
            .from('restaurants')
            .select('id')
            .eq('name', 'La Tradición Yucateca')
            .single();

        let restaurantId = existingRest?.id;

        if (!restaurantId) {
            const { data: restaurant, error: restError } = await supabase
                .from('restaurants')
                .insert({
                    owner_id: adminId,
                    name: 'La Tradición Yucateca',
                    description: 'Lo mejor de la comida regional en el corazón de Mérida.',
                    address: 'Calle 60 x 55 y 57, Centro, Mérida',
                    phone: '9991234567',
                    email: 'contacto@latradicion.com',
                    cuisine_type: 'Yucateca',
                    zone: 'Centro',
                    price_range: '$$',
                    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800',
                    is_active: true
                })
                .select()
                .single();

            if (restError) throw restError;
            restaurantId = restaurant.id;
            console.log('✅ Restaurante creado:', restaurant.name);
        } else {
            console.log('✅ Restaurante ya existe:', 'La Tradición Yucateca');
        }

        // 3. Crear Mesas (Limpiamos y recreamos para evitar duplicados complejos)
        await supabase.from('tables').delete().eq('restaurant_id', restaurantId);

        const tables = [
            { restaurant_id: restaurantId, number: 1, capacity: 2, status: 'available' },
            { restaurant_id: restaurantId, number: 2, capacity: 4, status: 'available' },
            { restaurant_id: restaurantId, number: 3, capacity: 4, status: 'available' },
            { restaurant_id: restaurantId, number: 4, capacity: 6, status: 'available' },
        ];

        const { error: tablesError } = await supabase.from('tables').insert(tables);
        if (tablesError) console.error('⚠️ Error al crear mesas:', tablesError.message);
        else console.log('✅ Mesas creadas correctamente');

        // 4. Crear Platillos (Limpiamos y recreamos)
        await supabase.from('menu_items').delete().eq('restaurant_id', restaurantId);

        const menuItems = [
            {
                restaurant_id: restaurantId,
                name: 'Cochinita Pibil',
                description: 'Cerdo marinado en achiote y naranja agria, cocido lentamente.',
                price: 185.00,
                category: 'Platillos Principales',
                is_highlighted: true,
                is_available: true,
                image_url: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&q=80&w=800'
            },
            {
                restaurant_id: restaurantId,
                name: 'Panuchos (3pz)',
                description: 'Tortillas rellenas de frijol con pavo asado y cebolla morada.',
                price: 95.00,
                category: 'Entradas',
                is_highlighted: false,
                is_available: true,
                image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800'
            },
            {
                restaurant_id: restaurantId,
                name: 'Sopa de Lima',
                description: 'Caldo de pollo nacional con jugo de lima y tiras de tortilla frita.',
                price: 85.00,
                category: 'Entradas',
                is_highlighted: true,
                is_available: true,
                image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744aba?auto=format&fit=crop&q=80&w=800'
            }
        ];

        const { error: menuError } = await supabase.from('menu_items').insert(menuItems);
        if (menuError) console.error('⚠️ Error al crear menú:', menuError.message);
        else console.log('✅ Menú creado correctamente');

        console.log('\n🎉 ¡Todo listo! Ahora puedes probar el sistema:');
        console.log('🔗 URL Login: http://localhost:8080/admin/login');
        console.log('📧 Email: admin@mesafeliz.com');
        console.log('🔑 Password: password123');

    } catch (err: any) {
        console.error('\n❌ ERROR FATAL:', err.message);
        if (err.hint) console.log('Pista:', err.hint);
    }
}

seed();
