'use client'

import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ClientWrapper } from '@/components/ClientWrapper';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';

// Removido o export da metadata conforme exigência do Next.js para arquivos com "use client"
const metadata = {
  title: "AgilizaOS",
  description: "Sistema de ordem de serviço",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());

  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>
        <SessionContextProvider supabaseClient={supabaseClient}>
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