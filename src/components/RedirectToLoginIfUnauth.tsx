'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isPublicPath } from '@/config/publicPaths';
import { handleAuthError, isInvalidRefreshTokenError } from '@/utils/clearAuth';

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

    // Timeout de segurança: liberar só se houver sessão válida
    const safetyTimer = setTimeout(async () => {
      if (cancelled) return;
      const { data: { session }, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error && isInvalidRefreshTokenError(error)) {
        handleAuthError(error);
        return;
      }
      if (session) {
        setReady(true);
      } else {
        router.replace(`/login?redirect=${encodeURIComponent(path || '/')}`);
      }
    }, 2500);

    async function check() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        if (handleAuthError(error)) return;
        clearTimeout(safetyTimer);
        router.replace(`/login?redirect=${encodeURIComponent(path || '/')}`);
        return;
      }

      if (!session) {
        await new Promise((r) => setTimeout(r, 200));
        if (cancelled) return;
        const { data: { session: sessionRetry }, error: retryError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (retryError && handleAuthError(retryError)) return;
        if (sessionRetry) {
          setReady(true);
          return;
        }
        clearTimeout(safetyTimer);
        const loginUrl = `/login?redirect=${encodeURIComponent(path || '/')}`;
        router.replace(loginUrl);
        return;
      }
      clearTimeout(safetyTimer);
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
