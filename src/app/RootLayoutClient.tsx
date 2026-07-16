'use client'

import './globals.css';
import '../styles/print.css';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { suppressLogsInProduction } from '@/utils/logger';
import { suppressNetworkErrors } from '@/utils/networkErrorSuppressor';
import { preCheckProblematicTables } from '@/utils/tableChecker';
import '@/utils/supabaseGlobalInterceptor';
import { useRealtimeNotificacoes } from '@/hooks/useRealtimeNotificacoes';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/ConfirmDialog';

import dynamic from 'next/dynamic';
import StickyOrcamentoPopup from '@/components/StickyOrcamentoPopup';
import PricingCalculatorFAB from '@/components/PricingCalculatorFAB';

const DynamicToaster = dynamic(() => import('@/components/ClientToaster'), { ssr: false });
import { Analytics } from '@vercel/analytics/react';
import { Suspense } from 'react';
import RedirectToLoginIfUnauth from '@/components/RedirectToLoginIfUnauth';
import RoutePermissionGuard from '@/components/RoutePermissionGuard';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import SubscriptionVencidaGuard from '@/components/SubscriptionVencidaGuard';
import { ThemeProvider } from '@/context/ThemeContext';
import SupabaseStatusBanner from '@/components/SupabaseStatusBanner';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import SubscriptionExpiryBanner from '@/components/SubscriptionExpiryBanner';

function AuthContent({ children }: { children: React.ReactNode }) {
  const { isLoggingOut, empresaData } = useAuth();
  useRealtimeNotificacoes(empresaData?.id);

  return isLoggingOut ? (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
      <span style={{ fontSize: 24 }}>Saindo...</span>
    </div>
  ) : (
    <>
      <ImpersonationBanner />
      <SubscriptionExpiryBanner />
      {children}
    </>
  );
}

function isAdminRoute(pathname: string | null): boolean {
  return pathname?.startsWith('/admin-login') === true || pathname?.startsWith('/admin-saas') === true;
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    suppressLogsInProduction();
    suppressNetworkErrors();
    preCheckProblematicTables().catch(() => {});
  }, []);

  if (isAdminRoute(pathname)) {
    return (
      <html lang="pt-BR" suppressHydrationWarning>
        <head>
          <script src="/theme-init.js" />
          <script src="/suppress-errors.js?v=2"></script>
          <script src="/aggressive-suppressor.js?v=2"></script>
        </head>
        <body suppressHydrationWarning>
          <ThemeProvider>
            <SupabaseStatusBanner />
            <AuthProvider>
              <ToastProvider>
                <ConfirmProvider>
                  {children}
                </ConfirmProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" />
        <script src="/theme-init.js" />
        <script src="/suppress-errors.js?v=2"></script>
        <script src="/aggressive-suppressor.js?v=2"></script>
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
        <SupabaseStatusBanner />
        <AuthProvider>
          <SubscriptionProvider>
          <RedirectToLoginIfUnauth>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
              </div>
            }>
              <RoutePermissionGuard>
            <SubscriptionVencidaGuard>
              <ToastProvider>
                <ConfirmProvider>
                  <AuthContent>
                    <StickyOrcamentoPopup />
                    <PricingCalculatorFAB />
                    <>{children}</>
                  </AuthContent>
                  <DynamicToaster />
                </ConfirmProvider>
              </ToastProvider>
            </SubscriptionVencidaGuard>
              </RoutePermissionGuard>
            </Suspense>
          </RedirectToLoginIfUnauth>
          </SubscriptionProvider>
        </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
