import React, { useState } from 'react'
import { Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [sendingRecovery, setSendingRecovery] = useState(false)

  const { login, authenticating } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMsg(null)

    const success = await login(email, password)
    if (!success) {
      setError('E-mail ou senha inválidos.')
      return
    }
    navigate('/', { replace: true })
  }

  const handleSendRecovery = async () => {
    setError(null)
    setMsg(null)

    if (!email) {
      setError('Informe seu e-mail para enviarmos o link de recuperação.')
      return
    }

    try {
      setSendingRecovery(true)

      // Ação: REMOVER redirectTo para que o Supabase use o fluxo de tokens no hash
      const { error: rpError } = await supabase.auth.resetPasswordForEmail(email, {})
      
      if (rpError) throw rpError

      setMsg('Enviamos um e-mail com o link para redefinir sua senha.')
    } catch (e: any) {
      setError(e?.message || 'Erro ao enviar o link de recuperação.')
    } finally {
      setSendingRecovery(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <button aria-label="Menu" type="button">
          <Menu size={24} className="text-gray-600" />
        </button>
        <img src="/assets/logo_clara.png" alt="Exímio" className="h-20" />
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center py-12">
        <div className="max-w-md w-full px-4">
          <div className="flex items-center justify-center mb-8 space-x-4">
            <div className="bg-yellow-400 rounded-full p-3 shadow-md">
              <img src="/assets/G Amarelo.png" alt="G" className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">
              Smart <span className="text-yellow-400">Glosa</span>
            </h1>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-lg rounded-2xl px-8 py-10 space-y-6"
          >
            <h2 className="text-xl font-semibold text-center text-gray-700">
              Acesse sua conta
            </h2>

            {msg && <p className="text-green-600 text-sm text-center">{msg}</p>}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={authenticating}
                className="w-full h-12 border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authenticating}
                className="w-full h-12 border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full h-12 bg-yellow-400 text-white text-lg font-medium rounded-lg hover:bg-yellow-500 transition disabled:opacity-70"
            >
              {authenticating ? 'Entrando...' : 'Entrar'}
            </button>

            {/* Esqueci minha senha */}
            <button
              type="button"
              onClick={handleSendRecovery}
              disabled={sendingRecovery}
              className="w-full text-sm text-gray-700 underline mt-1 disabled:opacity-60"
            >
              {sendingRecovery ? 'Enviando…' : 'Esqueci minha senha'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Esta plataforma é exclusiva para colaboradores.
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
