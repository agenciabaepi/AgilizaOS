'use client'

import './globals.css';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/ConfirmDialog';

// Removido o export da metadata conforme exigência do Next.js para arquivos com "use client"
const metadata = {
  title: "ConsertOS",
  description: "Sistema de ordem de serviço",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>
        <SessionContextProvider supabaseClient={supabaseClient}>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                {children}
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </SessionContextProvider>
      </body>
    </html>
  );
}