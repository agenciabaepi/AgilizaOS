'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { AuthProvider } from '@/context/AuthContext'

interface Props {
  children: React.ReactNode
}

export function ClientWrapper({ children }: Props) {
  const [supabaseClient] = useState(() => createClientComponentClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionContextProvider>
  )
}