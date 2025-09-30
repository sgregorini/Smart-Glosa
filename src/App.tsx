import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import HubAcoes from './pages/execucao/HubAcoes'
import { useAuth } from '@/context/AuthContext'
import ConfiguracoesMestre from './pages/Configuracoes/ConfiguracoesMestre'
import ConfiguracoesUsuarios from './pages/Configuracoes/ConfiguracoesUsuarios'
import MeuPerfil from './pages/Configuracoes/MeuPerfil'
import ResetPassword from './pages/ResetPassword'

function BootScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-600 text-sm">Carregando…</div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, booted } = useAuth()
  if (!booted) return <BootScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, booted } = useAuth()
  if (!booted) return <BootScreen />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
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
        <Route path="/reset-password" element={<ResetPassword />} />

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
      </Routes>
    </BrowserRouter>
  )
}
