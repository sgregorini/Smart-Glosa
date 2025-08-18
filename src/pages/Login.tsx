import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ajuste o caminho se necessário
import { Menu } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: usuario, error: fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !usuario) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }

    if (usuario.senha !== password) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }

    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('usuario_id', usuario.id);
    localStorage.setItem('usuario_nome', usuario.nome);

    // Redireciona com recarregamento forçado
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <button aria-label="Menu">
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

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

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
                className="w-full h-12 border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                className="w-full h-12 border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-yellow-400 text-white text-lg font-medium rounded-lg hover:bg-yellow-500 transition"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Esta plataforma é exclusiva para colaboradores.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
