// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Perfil } from '@/types'

interface AuthContextType {
  user: any | null
  perfil: Perfil | null
  booted: boolean
  loading: boolean
  authenticating: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  const [booted, setBooted] = useState(false)      // ✅ app pronto após 1ª hidratação
  const [loading, setLoading] = useState(false)    // ✅ só durante login()
  const [authenticating, setAuthenticating] = useState(false)

  const handledInitialRef = useRef(false)
  const currentUserIdRef = useRef<string | null>(null)
  const loginInFlightRef = useRef(false)

  // 🔑 Busca o perfil na view (usuarios_perfis)
// ⬇️ SUBSTITUA seu fetchPerfilById por este
const fetchPerfilById = async (uid: string): Promise<Perfil | null> => {
  const { data, error } = await supabase
    .from('usuarios')
    // 'cargo' NÃO existe nessa tabela; remova
    .select('id, nome, criado_em:created_at, foto_url, role, id_setor')
    .eq('id', uid)
    .maybeSingle()

  if (error) {
    console.warn('[Auth] erro ao buscar perfil:', error.message)
    return null
  }
  return (data as Perfil) ?? null
}


const ensureUsuarioRecord = async (usr: any) => {
  if (!usr) return

  // 1) tenta buscar a linha atual
  const { data: row, error: selErr } = await supabase
    .from('usuarios')
    .select('id, nome')
    .eq('id', usr.id)
    .maybeSingle()

  if (selErr) {
    console.warn('[Auth] ensureUsuarioRecord select error:', selErr.message)
    return
  }

  // fallback só para primeira gravação / quando estiver vazio
  const fallbackName =
    usr.user_metadata?.full_name ||
    (usr.email ? String(usr.email).split('@')[0] : null)

  if (!row) {
    // 2) não existe -> insere uma vez
    const { error: insErr } = await supabase.from('usuarios').insert({
      id: usr.id,
      nome: fallbackName,
    })
    if (insErr) console.warn('[Auth] insert usuarios error:', insErr.message)
    return
  }

  if (!row.nome || !row.nome.trim()) {
    // 3) existe mas nome está vazio -> preenche uma vez
    const { error: updErr } = await supabase
      .from('usuarios')
      .update({ nome: fallbackName })
      .eq('id', usr.id)
    if (updErr) console.warn('[Auth] update usuarios error:', updErr.message)
  }

  // 4) se já tem nome -> NÃO faz nada (não sobrescreve!)
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
    // 1) Sai do Supabase
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.warn('[Auth] erro no signOut:', error.message)
    }
  } finally {
    // 2) Zera tudo no app (antes mesmo do evento chegar)
    setUser(null)
    setPerfil(null)
    currentUserIdRef.current = null

    // 3) Limpa qualquer storage próprio seu
    localStorage.removeItem('smartglosa.auth')
    sessionStorage.removeItem('smartglosa.auth')

    // 4) (opcional) zera o cache do supabase-js (às vezes ajuda em dev)
    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        console.warn('[Auth] sessão ainda presente após signOut (dev cache).')
      }
    } catch {}
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
