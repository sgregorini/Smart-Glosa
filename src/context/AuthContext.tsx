// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Session, User } from '@supabase/supabase-js'
import type { Usuario } from '@/types'

export interface AuthContextType {
  user: User | null
  session: Session | null
  usuarioDetalhes: Usuario | null
  currentOrgId: string | null
  role: string | null
  responsavelId: string | null
  booted: boolean
  loadingAuth: boolean
  login: (email: string, pass: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUsuarioDetalhes: () => Promise<void>
  /** <- ADICIONADO: força re-fetch do user do Auth (e sincroniza usuarioDetalhes) */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [booted, setBooted] = useState(false)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [usuarioDetalhes, setUsuarioDetalhes] = useState<Usuario | null>(null)
  const [responsavelId, setResponsavelId] = useState<string | null>(null)

  // ===== Boot inicial =====
  useEffect(() => {
    ;(async () => {
      const [{ data: sessionData }, { data: userData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ])
      setSession(sessionData.session ?? null)
      setUser(userData.user ?? null)
      setBooted(true)
      setLoadingAuth(false)
    })()

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setBooted(true)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  // ===== Buscar detalhes na tabela 'usuarios' =====
  const fetchUsuarioDetalhes = useCallback(async (userId: string) => {
    if (!userId) {
      setUsuarioDetalhes(null)
      setCurrentOrgId(null)
      setResponsavelId(null)
      return
    }
    try {
      setLoadingAuth(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, role, id_setor, foto_url, created_at')
        .eq('id', userId)
        .single()
      if (error) throw error
      setUsuarioDetalhes(data as Usuario)

      // Busca o ID de responsável correspondente ao email do usuário
      const userEmail = user?.email;
      if (userEmail) {
        const { data: respData, error: respError } = await supabase
          .from('responsaveis')
          .select('id')
          .eq('email', userEmail)
          .single();
        if (respData) setResponsavelId(respData.id);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err)
      setUsuarioDetalhes(null)
      setResponsavelId(null)
    } finally {
      setLoadingAuth(false)
    }
  }, [])

  const refreshUsuarioDetalhes = useCallback(async () => {
    if (user?.id) {
      await fetchUsuarioDetalhes(user.id)
    }
  }, [user, fetchUsuarioDetalhes])

  // ===== ADICIONADO: refreshUser =====
  const refreshUser = useCallback(async () => {
    try {
      const [{ data: sessionData }, { data: userData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ])
      setSession(sessionData.session ?? null)
      setUser(userData.user ?? null)
      if (userData.user?.id) {
        await fetchUsuarioDetalhes(userData.user.id)
      } else {
        setUsuarioDetalhes(null)
        setCurrentOrgId(null)
        setResponsavelId(null)
      }
    } catch (err) {
      console.error('Erro ao atualizar user:', err)
    }
  }, [fetchUsuarioDetalhes])

  // Mantém usuarioDetalhes sincronizado ao logar/deslogar
  useEffect(() => {
    if (user?.id) fetchUsuarioDetalhes(user.id)
    else {
      setUsuarioDetalhes(null)
      setCurrentOrgId(null)
      setResponsavelId(null)
    }
  }, [user, fetchUsuarioDetalhes])

  // ===== Ações básicas =====
  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    return !error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    // pós-logout: zera estados chave
    setSession(null)
    setUser(null)
    setUsuarioDetalhes(null)
    setCurrentOrgId(null)
    setResponsavelId(null)
  }

  const value: AuthContextType = {
    user,
    session,
    usuarioDetalhes,
    currentOrgId,
    role: usuarioDetalhes?.role ?? null,
    responsavelId,
    booted,
    loadingAuth,
    login,
    logout,
    refreshUsuarioDetalhes,
    refreshUser, // <- agora disponível no contexto
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
