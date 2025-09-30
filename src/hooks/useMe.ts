// src/hooks/useMe.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type Me = {
  user_id: string
  nome: string | null
  email: string | null
  id_setor: string | null
  org_id: string | null
  org_nome: string | null
  role_slug: 'admin' | 'gestor' | 'colaborador' | 'cliente' | null
}

export function useMe() {
  const [data, setData] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from('vw_me').select('*').maybeSingle()
        if (error) throw error
        if (mounted) setData((data as Me) ?? null)
      } catch (e: any) {
        if (mounted) setError(e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const can = {
    deleteAcoes: data?.role_slug === 'admin',
    editAcoes: data ? ['admin', 'gestor'].includes(data.role_slug ?? '') : false,
    viewAcoes: !!data?.org_id,
  }

  return { me: data, loading, error, can }
}
