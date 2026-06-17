'use client'

import './globals.css';
import '../styles/print.css';
import { useEffect, useState } from 'react';
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
import RedirectToLoginIfUnauth from '@/components/RedirectToLoginIfUnauth';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import SubscriptionVencidaGuard from '@/components/SubscriptionVencidaGuard';
import { ThemeProvider } from '@/context/ThemeContext';
import SupabaseStatusBanner from '@/components/SupabaseStatusBanner';

function AuthContent({ children }: { children: React.ReactNode }) {
  const { isLoggingOut, session, empresaData } = useAuth();
  useRealtimeNotificacoes(empresaData?.id);

  const [banner, setBanner] = useState<{ texto: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBanner(null);
    async function checkVencimento() {
      try {
        if (!session || !empresaData?.id) return;
        const params = new URLSearchParams({ empresaId: empresaData.id });
        const res = await fetch(`/api/admin-saas/minha-assinatura?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const proxima = json?.assinatura?.proxima_cobranca ? new Date(json.assinatura.proxima_cobranca) : null;
        const status = json?.assinatura?.status || '';
        if (!proxima) return;
        const hoje = new Date();
        const d0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const amanha = new Date(d0);
        amanha.setDate(d0.getDate() + 1);
        const proxDateOnly = new Date(proxima.getFullYear(), proxima.getMonth(), proxima.getDate());
        if (
          status === 'active' &&
          proxDateOnly.getTime() === amanha.getTime()
        ) {
          if (!cancelled) setBanner({ texto: `Seu acesso vence amanhã (${proxima.toLocaleDateString('pt-BR')}). Garanta a renovação para não interromper o uso.` });
        }
      } catch {}
    }
    checkVencimento();
    return () => { cancelled = true; };
  }, [session?.user?.id, empresaData?.id]);
  return isLoggingOut ? (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
      <span style={{ fontSize: 24 }}>Saindo...</span>
    </div>
  ) : (
    <>
      {banner && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 60,
          background: '#FEF9C3', color: '#92400E',
          borderBottom: '1px solid #FDE68A',
          padding: '10px 16px', textAlign: 'center', fontSize: 14
        }}>
          {banner.texto}
        </div>
      )}
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
          </RedirectToLoginIfUnauth>
          </SubscriptionProvider>
        </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
