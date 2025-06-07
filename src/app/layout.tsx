'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());

  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>
        <SessionContextProvider supabaseClient={supabase}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SessionContextProvider>
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
      </body>
    </html>
  );
}