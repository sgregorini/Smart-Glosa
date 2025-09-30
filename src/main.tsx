// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from '@/context/AuthContext'
import { MeProvider } from '@/context/MeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <MeProvider>
        <App />   {/* 🚫 sem BrowserRouter aqui */}
      </MeProvider>
    </AuthProvider>
  </React.StrictMode>,
)
