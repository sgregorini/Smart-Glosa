// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.error('[Supabase] ENV faltando:', {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_ANON_KEY: anon ? '***' : undefined,
  })
  throw new Error('VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não definidos no .env')
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'smartglosa.auth',
      // ✅ use PKCE para evitar consumo por scanners
      flowType: 'pkce',
    },
  }
)

// supabaseClient.ts (após criar o client)
if (import.meta.env.DEV) {
  console.log('[ENV CHECK]', {
    url: import.meta.env.VITE_SUPABASE_URL,
    anon_is_present: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  });
}

