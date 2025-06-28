'use client'

import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';

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
            {children}
          </AuthProvider>
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
        </SessionContextProvider>
      </body>
    </html>
  );
}