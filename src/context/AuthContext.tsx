import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Interface mínima do que queremos ter disponível
interface UsuarioPerfil {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null)
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null)

  const [booted, setBooted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)

  const handledInitialRef = useRef(false)
  const currentUserIdRef = useRef<string | null>(null)
  const loginInFlightRef = useRef(false)

  // 🔑 Busca o perfil direto da tabela `usuarios`
  const fetchPerfilById = async (uid: string): Promise<UsuarioPerfil | null> => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, created_at, foto_url, role, id_setor')
      .eq('id', uid)
      .maybeSingle()

    if (error) {
      console.warn('[Auth] erro ao buscar perfil:', error.message)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      nome: data.nome,
      foto_url: data.foto_url,
      role: data.role,
      id_setor: data.id_setor,
      criado_em: data.created_at,
    }
  }

  const ensureUsuarioRecord = async (usr: any) => {
    if (!usr) return

    const { data: row, error: selErr } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('id', usr.id)
      .maybeSingle()

    if (selErr) {
      console.warn('[Auth] ensureUsuarioRecord select error:', selErr.message)
      return
    }

    const fallbackName =
      usr.user_metadata?.full_name ||
      (usr.email ? String(usr.email).split('@')[0] : null)

    if (!row) {
      const { error: insErr } = await supabase.from('usuarios').insert({
        id: usr.id,
        nome: fallbackName,
      })
      if (insErr) console.warn('[Auth] insert usuarios error:', insErr.message)
      return
    }

    if (!row.nome || !row.nome.trim()) {
      const { error: updErr } = await supabase
        .from('usuarios')
        .update({ nome: fallbackName })
        .eq('id', usr.id)
      if (updErr) console.warn('[Auth] update usuarios error:', updErr.message)
    }
  }

  useEffect(() => {
    let mounted = true
    let unsub: { unsubscribe: () => void } | null = null

    const hydrate = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const currentUser = sessionData?.session?.user ?? null
        if (!mounted) return

        setUser(currentUser)
        currentUserIdRef.current = currentUser?.id ?? null

        if (currentUser) {
          await ensureUsuarioRecord(currentUser)
          const p = await fetchPerfilById(currentUser.id)
          if (!mounted) return
          setPerfil(p)
        } else {
          setPerfil(null)
        }
      } catch (e) {
        console.warn('[Auth] hydrate exception:', e)
      } finally {
        if (mounted) setBooted(true)
      }

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return
        const nextUser = session?.user ?? null

        if (event === 'INITIAL_SESSION') {
          if (handledInitialRef.current) return
          handledInitialRef.current = true
          setUser(nextUser)
          if (nextUser) {
            await ensureUsuarioRecord(nextUser)
            const p = await fetchPerfilById(nextUser.id)
            if (!mounted) return
            setPerfil(p)
          }
          return
        }

        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'MFA_CHALLENGE_VERIFIED') {
          setUser(nextUser)
          if (nextUser) {
            await ensureUsuarioRecord(nextUser)
            const p = await fetchPerfilById(nextUser.id)
            if (!mounted) return
            setPerfil(p)
          }
          return
        }

        if (event === 'SIGNED_IN') {
          if (loginInFlightRef.current) return

          const prev = currentUserIdRef.current
          setUser(nextUser)
          currentUserIdRef.current = nextUser?.id ?? null

          if (nextUser && prev === nextUser.id && perfil) return

          if (nextUser) {
            await ensureUsuarioRecord(nextUser)
            const p = await fetchPerfilById(nextUser.id)
            if (!mounted) return
            setPerfil(p)
          } else {
            setPerfil(null)
          }
          return
        }

        if (event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY') {
          setUser(null)
          currentUserIdRef.current = null
          setPerfil(null)
          return
        }
      })
      unsub = data.subscription
    }

    hydrate()

    return () => {
      try { unsub?.unsubscribe() } catch {}
      mounted = false
    }
  }, []) // eslint-disable-line

 const login = async (email: string, password: string) => {
    setAuthenticating(true)
    loginInFlightRef.current = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data?.user) return false

      setUser(data.user)
      currentUserIdRef.current = data.user.id

      setLoading(true)
      await ensureUsuarioRecord(data.user)
      const p = await fetchPerfilById(data.user.id)
      setPerfil(p)
      setLoading(false)

      if (!booted) setBooted(true)
      return true
    } catch (e) {
      console.error('[Auth] exceção no login:', e)
      return false
    } finally {
      loginInFlightRef.current = false
      setAuthenticating(false)
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('[Auth] erro no signOut:', error.message)
      }
    } finally {
      setUser(null)
      setPerfil(null)
      currentUserIdRef.current = null
      localStorage.removeItem('smartglosa.auth')
      sessionStorage.removeItem('smartglosa.auth')
    }
  }

  return (
    <AuthContext.Provider value={{ user, perfil, booted, loading, authenticating, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}