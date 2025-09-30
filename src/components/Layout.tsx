// src/components/Layout.tsx
import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Play,
  Target,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

function getInitials(name?: string | null) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('') || 'U'
}

export default function Layout() {
  const { perfil, user, loading, booted, logout } = useAuth()

  // Estado da UI
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const raw = localStorage.getItem('sg_sidebar_collapsed')
    return raw === '1'
  })
  const [openDesempenho, setOpenDesempenho] = useState<boolean>(() => {
    const raw = localStorage.getItem('sg_open_desempenho')
    return raw ? raw === '1' : true
  })
  const [openExecucao, setOpenExecucao] = useState<boolean>(() => {
    const raw = localStorage.getItem('sg_open_execucao')
    return raw ? raw === '1' : false
  })
  const [openConfig, setOpenConfig] = useState<boolean>(() => {
    const raw = localStorage.getItem('sg_open_config')
    return raw ? raw === '1' : false
  })

  const location = useLocation()
  const navigate = useNavigate()

  const isDesempenhoActive = location.pathname === '/' || location.pathname.startsWith('/analytics')
  const isExecucaoActive = location.pathname.startsWith('/execucao')
  const isConfigActive = location.pathname.startsWith('/configuracoes')

  useEffect(() => {
    localStorage.setItem('sg_sidebar_collapsed', collapsed ? '1' : '0')
  }, [collapsed])
  useEffect(() => {
    localStorage.setItem('sg_open_desempenho', openDesempenho ? '1' : '0')
  }, [openDesempenho])
  useEffect(() => {
    localStorage.setItem('sg_open_execucao', openExecucao ? '1' : '0')
  }, [openExecucao])
  useEffect(() => {
    localStorage.setItem('sg_open_config', openConfig ? '1' : '0')
  }, [openConfig])

  const displayName =
    perfil?.nome ??
    user?.user_metadata?.full_name ??
    (user?.email ? String(user.email).split('@')[0] : null) ??
    null

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside
        className={classNames(
          collapsed ? 'w-20' : 'w-64',
          'bg-gray-50 border-r transition-[width] duration-200 ease-out flex flex-col'
        )}
      >
        {/* Branding + toggle */}
        <div className={classNames('px-4 py-4 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <div className="flex items-center space-x-3">
            <img src="/assets/G Amarelo.png" alt="G" className="h-8 w-8" />
            {!collapsed && (
              <h2 className="text-xl font-bold">
                Smart <span className="text-yellow-400">Glosa</span>
              </h2>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-2 rounded-md hover:bg-gray-200"
              title="Recolher"
            >
              <ChevronLeftIcon />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="px-2 pb-2">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-full p-2 rounded-md hover:bg-gray-200 flex items-center justify-center"
              title="Expandir"
            >
              <Menu size={18} />
            </button>
          </div>
        )}

        {/* Navegação */}
        <nav className="px-3 flex-1 overflow-y-auto">
          {/* Seção: Desempenho */}
          <div className="mb-2">
            <button
              onClick={() => setOpenDesempenho(!openDesempenho)}
              className={classNames(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium',
                isDesempenhoActive ? 'bg-yellow-100 text-gray-900' : 'text-gray-800 hover:bg-gray-100'
              )}
            >
              <div className="flex items-center space-x-2">
                <BarChart2 size={20} />
                {!collapsed && <span>Desempenho</span>}
              </div>
              {!collapsed && (
                openDesempenho
                  ? <ChevronDown size={16} className="transition" />
                  : <ChevronRight size={16} className="transition" />
              )}
            </button>
            {openDesempenho && !collapsed && (
              <div className="mt-1 ml-8 space-y-1">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    classNames(
                      'flex items-center px-3 py-2 rounded-md transition',
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/analytics"
                  className={({ isActive }) =>
                    classNames(
                      'flex items-center px-3 py-2 rounded-md transition',
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                >
                  Analytics
                </NavLink>
              </div>
            )}
          </div>

          {/* Seção: Execução */}
          <div className="mb-2">
            <button
              onClick={() => setOpenExecucao(!openExecucao)}
              className={classNames(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium',
                isExecucaoActive ? 'bg-yellow-100 text-gray-900' : 'text-gray-800 hover:bg-gray-100'
              )}
            >
              <div className="flex items-center space-x-2">
                <Play size={20} />
                {!collapsed && <span>Execução</span>}
              </div>
              {!collapsed && (
                openExecucao
                  ? <ChevronDown size={16} className="transition" />
                  : <ChevronRight size={16} className="transition" />
              )}
            </button>

            {openExecucao && !collapsed && (
              <div className="mt-1 ml-8 space-y-1">
                <NavLink
                  to="/execucao/hub"
                  className={({ isActive }) =>
                    classNames(
                      'flex items-center px-3 py-2 rounded-md transition',
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                >
                  HUB de ações
                </NavLink>
                <NavLink
                  to="/execucao/cronograma"
                  className={({ isActive }) =>
                    classNames(
                      'flex items-center px-3 py-2 rounded-md transition',
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                >
                  Cronograma
                </NavLink>
              </div>
            )}
          </div>

          {/* Seção: Metas */}
          <div className="mb-2">
            <NavLink
              to="/metas"
              className={({ isActive }) =>
                classNames(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-700 transition',
                  isActive ? 'bg-yellow-400 text-white' : 'hover:bg-gray-100'
                )
              }
            >
              <div className="flex items-center space-x-2">
                <Target size={20} />
                {!collapsed && <span>Metas</span>}
              </div>
              {!collapsed && <ChevronRight size={16} />}
            </NavLink>
          </div>

          {/* Seção: Configurações */}
          <div className="mb-2">
            <button
              onClick={() => setOpenConfig(!openConfig)}
              className={classNames(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium',
                isConfigActive ? 'bg-yellow-100 text-gray-900' : 'text-gray-800 hover:bg-gray-100'
              )}
            >
              <div className="flex items-center space-x-2">
                <Settings size={20} />
                {!collapsed && <span>Configurações</span>}
              </div>
              {!collapsed && (
                openConfig
                  ? <ChevronDown size={16} className="transition" />
                  : <ChevronRight size={16} className="transition" />
              )}
            </button>

            {openConfig && !collapsed && (
              <div className="mt-1 ml-8 space-y-1">
                <NavLink
                  to="/configuracoes/mestre"
                  className={({ isActive }) =>
                    classNames(
                      'flex items-center px-3 py-2 rounded-md transition',
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                >
                  Painel Mestre
                </NavLink>
                <NavLink
                  to="/configuracoes/usuarios"
                  className={({ isActive }) =>
                    classNames(
                      'flex items-center px-3 py-2 rounded-md transition',
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                >
                  Usuários
                </NavLink>
                <NavLink
                  to="/configuracoes/meu-perfil"
                  className={({ isActive }) =>
                    classNames(
                      'flex items-center px-3 py-2 rounded-md transition',
                      isActive ? 'bg-yellow-400 text-white' : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                >
                  Meu Perfil
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        {/* Rodapé da sidebar: perfil compacto */}
        <div className={classNames('border-t px-3 py-3 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-semibold">
              {getInitials(displayName || undefined)}
            </div>

            {!collapsed && (
              <div className="leading-tight">
                <div className="text-sm font-medium text-gray-900">{displayName || 'Usuário'}</div>
                <div className="text-xs text-gray-500 truncate max-w-[9rem]">
                  {user?.email || '—'}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-yellow-400 text-black px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-2">
            {/* Toggle da sidebar */}
            <button
              type="button"
              onClick={() => setCollapsed(c => !c)}
              className="p-2 rounded-md bg-white/70 hover:bg-white transition"
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              <Menu size={18} />
            </button>

            <span className="font-semibold uppercase tracking-wide">
              {!booted || loading ? 'Carregando…' : `Bem-vindo, ${displayName || 'Usuário'}`}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            title="Sair"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </header>

        <main className="flex-1 bg-white p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Ícone simples para "recolher" (chevron esquerdo) */
function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
