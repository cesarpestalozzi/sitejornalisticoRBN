import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const hasValidSupabaseUrl = Boolean(
  supabaseUrl &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co(?:\/)??$/i.test(supabaseUrl)
);

export const hasSupabaseConfig = Boolean(hasValidSupabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'rbn-auth-session',
      },
    })
  : null;
