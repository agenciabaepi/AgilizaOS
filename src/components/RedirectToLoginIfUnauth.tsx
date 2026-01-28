'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isPublicPath } from '@/config/publicPaths';

/**
 * Redireciona imediatamente para /login se o usuário não está logado
 * e tentou acessar qualquer rota privada do sistema.
 * Evita flash de conteúdo e complementa o redirect feito pelo middleware.
 */
export default function RedirectToLoginIfUnauth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (isPublicPath(pathname || '')) {
        setReady(true);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        const loginUrl = `/login?redirect=${encodeURIComponent(pathname || '/')}`;
        router.replace(loginUrl);
        return;
      }
      setReady(true);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const path = pathname || '';
  if (!ready && !isPublicPath(path)) {
    return null;
  }

  return <>{children}</>;
}
