'use client'

import './globals.css';
import '../styles/print.css';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import TrialExpiredGuard from '@/components/TrialExpiredGuard';
import { Toaster } from 'react-hot-toast';

// Metadata removida conforme exigência do Next.js para arquivos com "use client"

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
  return (
    <html lang="pt-BR">
      <head>
        <script src="/notification.js" defer></script>
      </head>
      <body suppressHydrationWarning={true}>
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
      </body>
    </html>
  );
}