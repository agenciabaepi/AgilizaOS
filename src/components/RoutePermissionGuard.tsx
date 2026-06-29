'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isPublicPath } from '@/config/publicPaths';
import {
  checkRouteAccess,
  canUseModule,
  getHomePathForUser,
} from '@/lib/permissions';
import { WHATSAPP_CRM_ENABLED } from '@/config/whatsapp-crm-config';

/** Permissão exigida por índice de aba em /configuracoes?tab=N */
const CONFIG_TAB_PERMISSIONS: Record<number, string> = {
  0: 'empresa',
  1: 'usuarios',
  2: 'regras-comissoes',
  3: 'precificacao',
  4: 'equipamentos-config',
  5: 'aparelhos',
  6: 'checklist',
  7: 'termos-config',
  8: 'status',
  9: 'link-publico',
  10: 'catalogo-config',
  11: 'whatsapp',
  12: 'avisos',
};

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin-login') || pathname.startsWith('/admin-saas');
}

/**
 * Guarda de permissões no cliente — complementa o middleware.
 * Bloqueia acesso direto por URL e navegação client-side.
 */
export default function RoutePermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const router = useRouter();
  const { usuarioData, userDataReady } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAdminRoute(pathname) || isPublicPath(pathname)) {
      setAllowed(true);
      return;
    }

    if (!userDataReady) return;

    if (!usuarioData) {
      setAllowed(true);
      return;
    }

    const nivel = usuarioData.nivel;
    const rawPermissoes = usuarioData.permissoes;

    if (!checkRouteAccess(pathname, nivel, rawPermissoes)) {
      setAllowed(false);
      router.replace(getHomePathForUser(nivel, rawPermissoes));
      return;
    }

    // /configuracoes?tab=N — validar permissão da aba específica
    if (pathname === '/configuracoes' || pathname.startsWith('/configuracoes')) {
      const tabParam = searchParams.get('tab');
      if (tabParam !== null) {
        const tabIndex = Number(tabParam);
        const tabPerm = CONFIG_TAB_PERMISSIONS[tabIndex];
        if (tabPerm === 'whatsapp' && !WHATSAPP_CRM_ENABLED) {
          setAllowed(false);
          router.replace(getHomePathForUser(nivel, rawPermissoes));
          return;
        }
        if (
          tabPerm &&
          !canUseModule(tabPerm, nivel, rawPermissoes)
        ) {
          setAllowed(false);
          router.replace(getHomePathForUser(nivel, rawPermissoes));
          return;
        }
      }
    }

    setAllowed(true);
  }, [pathname, searchParams, usuarioData, userDataReady, router]);

  if (isAdminRoute(pathname) || isPublicPath(pathname)) {
    return <>{children}</>;
  }

  if (!userDataReady || allowed === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
        <p className="text-sm text-gray-500">Verificando permissões...</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
        <p className="text-sm text-gray-500">Redirecionando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
