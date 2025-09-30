// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * Ajuste AQUI caso seu perfil venha de outra tabela/view.
 * Ex.: 'usuarios' com colunas { id, nome, foto_url, role, id_setor, criado_em }
 * ou uma view 'vw_usuarios'.
 */
const PERFIL_TABLE = 'usuarios'
const PERFIL_COLS = 'id, nome, foto_url, role, id_setor, criado_em'

export interface UsuarioPerfil {
  id: string
  nome: string | null
  foto_url: string | null
  role: string | null
  id_setor: string | null
  criado_em: string | null
}

interface AuthContextType {
  user: any | null
  perfil: UsuarioPerfil | null
  booted: boolean
  loading: boolean
  authenticating: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchPerfil(userId: string): Promise<UsuarioPerfil | null> {
  // Busca o perfil do usuário autenticado.
  // Se você usa outra tabela/view, ajuste PERFIL_TABLE/PERFIL_COLS acima.
  const { data, error } = await supabase
    .from(PERFIL_TABLE)
    .select(PERFIL_COLS)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    // perfil pode não existir ainda; não vamos quebrar a app
    // console.warn('fetchPerfil error:', error)
    return null
  }

  return (data as UsuarioPerfil) ?? null
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [booted, setBooted] = useState(false)          // app inicializado (já perguntamos sessão)
  const [loading, setLoading] = useState(true)         // carregando user/perfil
  const [authenticating, setAuthenticating] = useState(false) // durante login
  const [user, setUser] = useState<any | null>(null)
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null)

  // Primeira carga: pega sessão atual
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        const currentUser = data.session?.user ?? null
        if (mounted) setUser(currentUser)

        if (currentUser) {
          const p = await fetchPerfil(currentUser.id)
          if (mounted) setPerfil(p)
        } else {
          if (mounted) setPerfil(null)
        }
      } catch (e) {
        // console.warn('getSession error:', e)
      } finally {
        if (mounted) {
          setLoading(false)
          setBooted(true)
        }
      }
    })()

    return () => { mounted = false }
  }, [])

  // Listener de mudanças de auth (login/logout/refresh token)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      if (nextUser) {
        const p = await fetchPerfil(nextUser.id)
        setPerfil(p)
      } else {
        setPerfil(null)
      }
    })

    return () => { sub.subscription.unsubscribe() }
  }, [])

  const login = async (email: string, password: string) => {
    setAuthenticating(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return false
      const u = data.user ?? null
      setUser(u)

      if (u) {
        const p = await fetchPerfil(u.id)
        setPerfil(p)
      }
      return !!u
    } finally {
      setAuthenticating(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
  }

  const refreshPerfil = async () => {
    if (!user?.id) return
    const p = await fetchPerfil(user.id)
    setPerfil(p)
  }

  const value = useMemo<AuthContextType>(() => ({
    user,
    perfil,
    booted,
    loading,
    authenticating,
    login,
    logout,
    refreshPerfil,
  }), [user, perfil, booted, loading, authenticating])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
