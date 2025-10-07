// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Variáveis de ambiente (Vite)
 * Defina em .env:
 *  VITE_SUPABASE_URL=
 *  VITE_SUPABASE_ANON_KEY=
 */
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

/**
 * Cliente Supabase (browser)
 * - flowType: 'pkce' → suporta /reset-password com ?code=
 * - persistSession: true → mantém login após F5
 * - autoRefreshToken: true → renova token em background
 * - detectSessionInUrl: true → cria sessão automaticamente no callback do PKCE
 */
export const supabase: SupabaseClient = createClient(url, anon, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Se você usar schemas diferentes, defina aqui:
  // db: { schema: 'public' },
})

/* =========================
 * Helpers de autenticação
 * ========================= */

/** Retorna a sessão atual (ou null) */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session ?? null
}

/** Retorna o usuário atual (ou null) */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user ?? null
}
