'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isPublicPath } from '@/config/publicPaths';

/** Rotas do painel admin - acesso totalmente separado do sistema principal (não exige sessão Supabase). */
function isAdminRoute(pathname: string): boolean {
  return pathname?.startsWith('/admin-login') === true || pathname?.startsWith('/admin-saas') === true;
}

/**
 * Redireciona imediatamente para /login se o usuário não está logado
 * e tentou acessar qualquer rota privada do sistema.
 * Evita flash de conteúdo e complementa o redirect feito pelo middleware.
 * ⚠️ Admin (admin-login, admin-saas) é exceção: usa autenticação própria via cookie.
 */
export default function RedirectToLoginIfUnauth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const path = pathname || '';

    if (isAdminRoute(path) || isPublicPath(path)) {
      setReady(true);
      return;
    }

    // Timeout de segurança: não travar a tela em branco se getSession demorar
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 2500);

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        await new Promise((r) => setTimeout(r, 200));
        if (cancelled) return;
        const { data: { session: sessionRetry } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionRetry) {
          setReady(true);
          return;
        }
        clearTimeout(safetyTimer);
        const loginUrl = `/login?redirect=${encodeURIComponent(path || '/')}`;
        router.replace(loginUrl);
        return;
      }
      setReady(true);
    }

    check();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [pathname, router]);

  const path = pathname || '';
  if (!ready && !isPublicPath(path) && !isAdminRoute(path)) {
    return null;
  }

  return <>{children}</>;
}
