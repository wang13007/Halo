import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '../config.js';

const client = isSupabaseConfigured()
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const getSupabase = () => {
  if (!client) {
    throw new Error(
      'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.',
    );
  }

  return client;
};
