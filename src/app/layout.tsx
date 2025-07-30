'use client'

import './globals.css';
import '../styles/print.css';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import TrialExpiredGuard from '@/components/TrialExpiredGuard';
import { Toaster } from 'react-hot-toast';

// Removido o export da metadata conforme exigência do Next.js para arquivos com "use client"
const metadata = {
  title: "ConsertOS",
  description: "Sistema de ordem de serviço",
};

function AuthContent({ children }: { children: React.ReactNode }) {
  const { isLoggingOut } = useAuth();
  return isLoggingOut ? (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
      <span style={{ fontSize: 24 }}>Saindo...</span>
    </div>
  ) : (
    <>{children}</>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>
        <SessionContextProvider supabaseClient={supabaseClient}>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <AuthContent>
                  <TrialExpiredGuard>
                    {children}
                  </TrialExpiredGuard>
                </AuthContent>
                <Toaster position="top-right" />
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </SessionContextProvider>
      </body>
    </html>
  );
}