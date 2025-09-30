import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()

  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [initialCheckComplete, setInitialCheckComplete] = useState(false)

  // Lê dos dois lugares: ?query e #hash
  const parsed = useMemo(() => {
    const url = new URL(window.location.href)
    const sp = url.searchParams
    const hp = new URLSearchParams(url.hash.replace(/^#/, ''))
    return {
      typeQ: sp.get('type') || hp.get('type'),
      token:
        sp.get('code') ||
        sp.get('token_hash') ||
        hp.get('code') ||
        hp.get('token_hash'),
      emailQ: sp.get('email') || hp.get('email'),
    }
  }, [location.key])

  // 1) Troca o token por sessão
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (parsed.typeQ === 'recovery' && parsed.token && parsed.emailQ) {
          const { data, error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            email: parsed.emailQ,
            token: parsed.token,
          })
          if (error) {
            setError(error.message)
            setInitialCheckComplete(true)
            return
          }
          if (data?.session && !cancelled) {
            setSessionReady(true)
            setError(null)
            setInitialCheckComplete(true)
            if (window.location.search || window.location.hash) {
              window.history.replaceState(null, '', '/reset-password')
            }
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession()
          setSessionReady(!!session)
          setInitialCheckComplete(true)
          if (!session) {
            setError('O link de recuperação é inválido ou não foi solicitado.')
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Erro ao validar o link de recuperação.')
        setInitialCheckComplete(true)
      }
    })()
    return () => { cancelled = true }
  }, [parsed])

  // 2) Listener de auth (inclui PASSWORD_RECOVERY)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
        setSessionReady(true)
        setError(null)
        setInitialCheckComplete(true)
        if (window.location.search || window.location.hash) {
          window.history.replaceState(null, '', '/reset-password')
        }
      } else if (!session && initialCheckComplete && !parsed.token) {
        setError('O link de recuperação está inválido ou expirou. Solicite um novo.')
      }
    })
    return () => subscription.unsubscribe()
  }, [initialCheckComplete, parsed.token])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!sessionReady) {
      setError('Sessão não verificada. Abra o link completo do e-mail.')
      setLoading(false)
      return
    }

    try {
      if (newPassword.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      alert('Senha alterada com sucesso!')
      navigate('/login')
    } catch (e: any) {
      setError(e?.message || 'Erro ao atualizar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleUpdate} className="bg-white shadow p-6 rounded-lg w-96">
        <h1 className="text-lg font-semibold mb-4">Definir nova senha</h1>

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        {!initialCheckComplete && (
          <div className="text-blue-600 text-sm mb-3">Verificando link de recuperação...</div>
        )}

        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nova senha"
          className="w-full border px-3 py-2 rounded mb-3"
          disabled={!sessionReady || loading || !initialCheckComplete}
        />
        <button
          type="submit"
          disabled={!sessionReady || loading || !initialCheckComplete}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 rounded"
        >
          {loading ? 'Atualizando…' : 'Atualizar senha'}
        </button>
      </form>
    </div>
  )
}
