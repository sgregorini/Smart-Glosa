// src/context/MeContext.tsx
import React, { createContext, useContext } from 'react'
import { useMe } from '@/hooks/useMe'

type Ctx = ReturnType<typeof useMe> | null

const MeContext = createContext<Ctx>(null)

export function MeProvider({ children }: { children: React.ReactNode }) {
  const value = useMe()
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>
}

export function useMeContext() {
  const ctx = useContext(MeContext)
  if (!ctx) throw new Error('useMeContext must be used within <MeProvider>')
  return ctx
}
