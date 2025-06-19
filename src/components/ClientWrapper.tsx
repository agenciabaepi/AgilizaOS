'use client'

import { useEffect, useState } from 'react'
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession()

      if (!session) {
        console.warn('No session found:', error)
      }

      setIsLoading(false)
    }

    fetchSession()
  }, [supabaseClient])

  if (isLoading) {
    return null
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionContextProvider>
  )
}