'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Hook DESATIVADO: causava reload da página ao trocar de aba do navegador e voltar,
 * pois pathname/visibility pode mudar ao retornar à aba e disparava window.location.reload().
 * Não usar na aplicação — navegação deve ser SPA (sem reload).
 */
export function useAutoReload() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    // Não fazer reload — estava causando "recarrega sozinho ao mudar de aba e voltar"
    previousPathname.current = pathname;
  }, [pathname]);
}
