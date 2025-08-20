// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.error('[Supabase] ENV faltando:',
    { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anon ? '***' : undefined }
  )
  throw new Error('VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não definidos no .env')
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'smartglosa.auth'
  }
})
