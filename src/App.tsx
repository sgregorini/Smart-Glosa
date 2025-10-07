// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import HubAcoes from './pages/execucao/HubAcoes'
import { useAuth } from '@/context/AuthContext'
import ConfiguracoesMestre from './pages/Configuracoes/ConfiguracoesMestre'
import ConfiguracoesUsuarios from './pages/Configuracoes/ConfiguracoesUsuarios'
import MeuPerfil from './pages/Configuracoes/MeuPerfil'
import ResetPassword from './pages/ResetPassword'
import { useEffect } from 'react'

function BootScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-600 text-sm">Carregando…</div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loadingAuth } = useAuth()
  if (loadingAuth) return <BootScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loadingAuth } = useAuth()
  if (loadingAuth) return <BootScreen />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Rota dedicada para sair: chama logout() e redireciona */
function LogoutRoute() {
  const { logout } = useAuth()
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    // O onAuthStateChange no AuthContext vai detectar a ausência de sessão e o PublicRoute/PrivateRoute fará o resto.
    // Para uma experiência mais imediata, podemos forçar o redirecionamento.
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return <BootScreen />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* rotas públicas */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        {/* reset-password público, mas se estiver logado o PublicRoute redireciona pro "/" */}
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        {/* rota utilitária para logout (use em um botão/link para /logout) */}
        <Route path="/logout" element={<LogoutRoute />} />

        {/* rotas privadas */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="execucao/hub" element={<HubAcoes />} />

          <Route path="configuracoes">
            <Route path="mestre" element={<ConfiguracoesMestre />} />
            <Route path="usuarios" element={<ConfiguracoesUsuarios />} />
            <Route path="meu-perfil" element={<MeuPerfil />} />
          </Route>
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
