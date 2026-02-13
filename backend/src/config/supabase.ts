import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Client for general API operations (uses anon key, respects RLS)
// Using 'any' for flexibility during development - types will be inferred from responses
export const supabase = createClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Admin client for bypassing RLS (use sparingly!)
export const supabaseAdmin = createClient(
    env.supabaseUrl,
    env.supabaseServiceRoleKey || env.supabaseAnonKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Helper to create a client with user's JWT for RLS
export function createUserClient(accessToken: string) {
    return createClient(
        env.supabaseUrl,
        env.supabaseAnonKey,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
