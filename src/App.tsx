import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import HubAcoes from './pages/execucao/HubAcoes';

export default function App() {
  const isAuthenticated = /* aqui você pode checar um flag no localStorage, Context ou estado global */
    Boolean(localStorage.getItem('loggedIn'))

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* ROTAS PROTEGIDAS */}
        <Route
          element={
            isAuthenticated
              ? <Layout />
              : <Navigate to="/login" replace />
          }
        >
          <Route path="/" element={<Dashboard />} />
          {/* outras páginas internas */}
          <Route path="execucao/hub" element={<HubAcoes />} />
        </Route>

        {/* se não achar rota, manda pro login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
