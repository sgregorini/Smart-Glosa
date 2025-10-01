// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from '@/context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />   {/* 🚫 BrowserRouter já está dentro do App.tsx */}
    </AuthProvider>
  </React.StrictMode>
)
