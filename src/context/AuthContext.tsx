// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * PERFIL: dados básicos da tabela usuarios
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
  org_id?: string | null
  org_nome?: string | null
  role_slug?: 'admin' | 'gestor' | 'colaborador' | 'cliente' | null
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
  can: {
    deleteAcoes: boolean
    editAcoes: boolean
    viewAcoes: boolean
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchPerfil(userId: string): Promise<UsuarioPerfil | null> {
  // Tenta trazer dados enriquecidos da view vw_me (org/role_slug)
  const { data: vwMe, error: vwErr } = await supabase
    .from('vw_me')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!vwErr && vwMe) {
    return vwMe as UsuarioPerfil
  }

  // fallback para tabela usuarios (admin global pode cair aqui)
  const { data, error } = await supabase
    .from(PERFIL_TABLE)
    .select(PERFIL_COLS)
    .eq('id', userId)
    .maybeSingle()

  if (error) return null
  return (data as UsuarioPerfil) ?? null
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [booted, setBooted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authenticating, setAuthenticating] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null)

  // Primeira carga
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const currentUser = data.session?.user ?? null
        if (!mounted) return
        setUser(currentUser)
        setBooted(true)

        if (currentUser) {
          setLoading(true)
          const p = await fetchPerfil(currentUser.id)
          if (mounted) setPerfil(p)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Listener de auth
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setBooted(true)

      if (nextUser) {
        setLoading(true)
        const p = await fetchPerfil(nextUser.id)
        setPerfil(p)
        setLoading(false)
      } else {
        setPerfil(null)
        setLoading(false)
      }
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setAuthenticating(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return false
      const u = data.user ?? null
      setUser(u)
      setBooted(true)
      if (u) {
        setLoading(true)
        const p = await fetchPerfil(u.id)
        setPerfil(p)
        setLoading(false)
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
    setBooted(true)
  }

  const refreshPerfil = async () => {
    if (!user?.id) return
    setLoading(true)
    const p = await fetchPerfil(user.id)
    setPerfil(p)
    setLoading(false)
  }

  // permissões centralizadas
  const can = useMemo(() => {
    if (!perfil) {
      return { deleteAcoes: false, editAcoes: false, viewAcoes: false }
    }
    const role = perfil.role_slug ?? perfil.role
    return {
      deleteAcoes: role === 'admin',
      editAcoes: ['admin', 'gestor'].includes(role ?? ''),
      viewAcoes: !!perfil.org_id || role === 'admin', // admin global vê tudo
    }
  }, [perfil])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      perfil,
      booted,
      loading,
      authenticating,
      login,
      logout,
      refreshPerfil,
      can,
    }),
    [user, perfil, booted, loading, authenticating, can]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
