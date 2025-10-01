// src/pages/ResetPassword.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()

  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search])
  const hs = useMemo(() => new URLSearchParams((location.hash || '').replace(/^#/, '')), [location.hash])

  // 🔔 0) Escuta mudanças de auth: se logar via PKCE auto, habilita a UI
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSessionReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // 🔎 1) Primeiro, vê se já existe sessão ativa (caso PKCE tenha acontecido automaticamente)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!cancelled && data.session) setSessionReady(true)
    })()
    return () => { cancelled = true }
  }, [])

  // 🔐 2) Se não houver sessão e vier ?code=..., faz a troca manual (PKCE)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const code = qs.get('code')
      if (!code) return

      try {
        setLoading(true)
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        if (exErr) throw exErr
        if (!cancelled) {
          setSessionReady(true)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('[exchangeCodeForSession]', e)
          setError(e?.message || 'Não foi possível validar o link.')
          setSessionReady(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
        // limpa a query (?code=...)
        window.history.replaceState(null, '', '/reset-password')
      }
    })()
    return () => { cancelled = true }
  }, [qs])

  // 🧯 3) Fallback legado: #type=recovery&token_hash=... (só se ainda não tiver sessão)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const type = hs.get('type')
      const token_hash = hs.get('token_hash')
      if (type !== 'recovery' || !token_hash) return

      const { data } = await supabase.auth.getSession()
      if (data.session) return // já logado por PKCE

      try {
        setLoading(true)
        const { error: vErr } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash })
        if (vErr) throw vErr
        if (!cancelled) {
          setSessionReady(true)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('[verifyOtp(recovery)]', e)
          setError(e?.message || 'Link inválido ou expirado.')
          setSessionReady(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
        // limpa o hash
        window.history.replaceState(null, '', '/reset-password')
      }
    })()
    return () => { cancelled = true }
  }, [hs])

  // ❗ 4) NÃO bloqueia a UI só porque veio #error no hash — scanners “pré-clicam” o link.
  //    Damos uma chance para o SDK criar sessão automaticamente e só então exibimos erro persistente.
  useEffect(() => {
    const err = hs.get('error')
    if (!err) return
    // mostra aviso mas sem travar a UI à toa
    setError(hs.get('error_description') || 'Email link is invalid or has expired')
    // depois de 300ms, se sessão existir, limpamos o erro
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) setError(null)
    }, 300)
    return () => clearTimeout(t)
  }, [hs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    try {
      setLoading(true)
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw updateErr
      navigate('/login?reset=success', { replace: true })
    } catch (e: any) {
      console.error('[updateUser(password)]', e)
      setError(e?.message || 'Não foi possível atualizar a senha.')
    } finally {
      setLoading(false)
    }
  }

  const resend = async (email: string) => {
    setLoading(true)
    setError(null)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: rpErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (rpErr) throw rpErr
      alert('Novo e-mail de recuperação enviado! Copie o link do botão e cole direto na barra do navegador.')
    } catch (e: any) {
      console.error('[resetPasswordForEmail]', e)
      setError(e?.message || 'Erro ao reenviar o e-mail de recuperação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Definir nova senha</h1>

        {error && (
          <p className="text-red-600 mb-4 bg-red-100 border border-red-200 p-3 rounded">
            {error}
          </p>
        )}

        {!sessionReady && (
          <p className="text-blue-600 text-sm mb-4">
            Abra o link do e-mail de recuperação. Se o link expirou, peça um novo abaixo.
          </p>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">Digite sua nova senha</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          className="w-full border px-3 py-2 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          disabled={!sessionReady || loading}
          autoFocus
        />

        <button
          type="submit"
          disabled={!sessionReady || loading}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 rounded disabled:opacity-50 transition"
        >
          {loading ? 'Atualizando…' : 'Atualizar senha'}
        </button>

        {!sessionReady && <ResendBlock onSubmit={resend} loading={loading} />}
      </form>
    </div>
  )
}

/* ---------- Bloco de reenvio ---------- */
function ResendBlock({ onSubmit, loading }: { onSubmit: (email: string) => void; loading: boolean }) {
  const [email, setEmail] = useState('')
  return (
    <div className="mt-6 border-t pt-4">
      <label className="block text-sm font-medium mb-1">Reenviar e-mail de recuperação</label>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="flex-1 border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button
          type="button"
          onClick={() => email && onSubmit(email)}
          disabled={loading}
          className="px-3 py-2 rounded bg-gray-900 text-white disabled:opacity-60 hover:bg-gray-700 transition"
        >
          Enviar
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Dica: alguns provedores “pré-clicam” o link. <b>Copie o endereço do botão</b> do e-mail e cole na barra do navegador.
      </p>
    </div>
  )
}
