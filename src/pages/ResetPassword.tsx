import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [initialCheckComplete, setInitialCheckComplete] = useState(false)

  // 1) Checa se já existe sessão (Supabase já validou o link)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        setSessionReady(!!session)
      } finally {
        if (mounted) setInitialCheckComplete(true)
      }
    })()
    return () => { mounted = false }
  }, [])

  // 2) Ouve criação da sessão (quando usuário chega pelo link do e-mail)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
        setSessionReady(true)
        setError(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!sessionReady) {
      setError('Abra esta página pelo link do e-mail de recuperação.')
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
          <div className="text-blue-600 text-sm mb-3">Verificando sessão...</div>
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

        {!sessionReady && initialCheckComplete && (
          <p className="text-xs text-gray-500 mt-3">
            Abra esta página pelo link do e-mail de recuperação para habilitar a troca de senha.
          </p>
        )}
      </form>
    </div>
  )
}
