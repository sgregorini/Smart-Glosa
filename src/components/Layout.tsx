import { useState, useEffect} from 'react';
import { supabase } from '@/lib/supabaseClient' // necessário para buscar o nome

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Play,
  Target,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  // estados de dropdown
  const [openDesempenho, setOpenDesempenho] = useState(true);
  const [openExecucao, setOpenExecucao] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('loggedIn');
    navigate('/login', { replace: true });
  };

  const [nomeUsuario, setNomeUsuario] = useState('Usuário')

  useEffect(() => {
  async function fetchUsuario() {
    const usuarioId = localStorage.getItem('usuario_id')
    if (!usuarioId) return

    const { data, error } = await supabase
      .from('usuarios') // ou 'responsaveis' se for a tabela correta
      .select('nome')
      .eq('id', usuarioId)
      .single()

    if (data?.nome) setNomeUsuario(data.nome)
    else console.error('Erro ao carregar usuário:', error)
  }

  fetchUsuario()
}, [])


  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r">
        <div className="px-6 py-6 flex items-center space-x-3">
          <img src="/assets/G Amarelo.png" alt="G" className="h-8 w-8" />
          <h2 className="text-xl font-bold">
            Smart <span className="text-yellow-400">Glosa</span>
          </h2>
        </div>
        <nav className="px-4">
          {/* Desempenho dropdown */}
          <div className="mb-2">
            <button
              onClick={() => setOpenDesempenho(!openDesempenho)}
              className="w-full flex items-center justify-between px-4 py-2 bg-yellow-100 rounded-lg font-medium text-gray-800"
            >
              <div className="flex items-center space-x-2">
                <BarChart2 size={20} />
                <span>Desempenho</span>
              </div>
              <ChevronDown
                size={16}
                className={`${openDesempenho ? 'transform rotate-180' : ''} transition`} 
              />
            </button>
            {openDesempenho && (
              <div className="mt-1 ml-6 space-y-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-md transition ${
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/analytics"
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-md transition ${
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  Analytics
                </NavLink>
              </div>
            )}
          </div>

          {/* Execução dropdown */}
          <div className="mb-2">
            <button
              onClick={() => setOpenExecucao(!openExecucao)}
              className="w-full flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <Play size={20} />
                <span>Execução</span>
              </div>
              <ChevronDown
                size={16}
                className={`${openExecucao ? 'transform rotate-180' : ''} transition`} 
              />
            </button>
            {openExecucao && (
              <div className="mt-1 ml-6 space-y-1">
                <NavLink
                  to="/execucao/hub"
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-md transition ${
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  HUB de ações
                </NavLink>
                <NavLink
                  to="/execucao/cronograma"
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-md transition ${
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  Cronograma
                </NavLink>
              </div>
            )}
          </div>

          {/* Metas */}
          <div className="mb-2">
            <button className="w-full flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-2">
                <Target size={20} />
                <span>Metas</span>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Configurações */}
          <div className="mb-2">
            <button className="w-full flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-2">
                <Settings size={20} />
                <span>Configurações</span>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center bg-yellow-400 text-black px-6 py-4">
          <span className="font-semibold uppercase">Bem-vindo, {nomeUsuario}</span>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </header>

        <main className="flex-1 bg-white p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}