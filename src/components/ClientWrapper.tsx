// src/components/ClientWrapper.tsx
'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { AuthProvider } from '@/context/AuthContext'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionContextProvider>
  )
}