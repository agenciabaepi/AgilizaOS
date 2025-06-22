'use client'

import { useState } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { AuthProvider } from '@/context/AuthContext'
import { type Session } from '@supabase/auth-helpers-nextjs'

interface Props {
  children: React.ReactNode
  initialSession: Session | null
}

export function ClientWrapper({ children, initialSession }: Props) {
  const [supabaseClient] = useState(() => createPagesBrowserClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionContextProvider>
  )
}