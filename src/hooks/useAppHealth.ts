// src/hooks/useAppHealth.ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * Mantém a sessão “viva” e dispara refetch quando a janela ganha foco
 * ou a conexão volta. Passe funções de refetch no array.
 *
 * Ex.: useAppHealth([fetchAcoes])
 */
export function useAppHealth(refetchers: Array<() => void> = []) {
  useEffect(() => {
    let interval: any

    const refreshSession = async () => {
      try {
        // força o client a validar/atualizar a sessão se necessário
        await supabase.auth.getSession()
      } catch {
        // silencia; se falhar, próximo foco/interval tenta de novo
      }
    }

    const onFocus = () => {
      refreshSession()
      refetchers.forEach((fn) => fn?.())
    }

    const onOnline = () => {
      refreshSession()
      refetchers.forEach((fn) => fn?.())
    }

    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)

    // ping leve a cada 10 minutos
    interval = setInterval(refreshSession, 10 * 60 * 1000)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
      clearInterval(interval)
    }
  }, [refetchers])
}
