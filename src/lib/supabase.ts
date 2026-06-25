/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificación temporal (podemos quitarla después)
console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY:", supabaseKey ? "CARGADA" : "NO CARGADA");
console.log("ENV:", import.meta.env);

export const hasSupabaseConfig =
  Boolean(supabaseUrl && supabaseKey);

export const supabase =
  hasSupabaseConfig
    ? createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        }
      )
    : null;