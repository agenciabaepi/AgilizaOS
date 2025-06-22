'use client'

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Session } from '@supabase/auth-js';

import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ClientWrapper } from '@/components/ClientWrapper'

// Removido o export da metadata conforme exigência do Next.js para arquivos com "use client"
const metadata = {
  title: "AgilizaOS",
  description: "Sistema de ordem de serviço",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());
  const [initialSession, setInitialSession] = useState<Session | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setInitialSession(data.session);
    });
  }, [supabaseClient]);

  if (initialSession === undefined || initialSession === null) return null;

  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>
          <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
            <ClientWrapper>
              {children}
              <ToastContainer 
                position="bottom-right" 
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                pauseOnHover
                draggable
                theme="light"
              />
            </ClientWrapper>
          </SessionContextProvider>
      </body>
    </html>
  );
}