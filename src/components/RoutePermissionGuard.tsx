'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { isPublicPath } from '@/config/publicPaths';
import {
  checkRouteAccess,
  canUseModule,
  getHomePathForUser,
} from '@/lib/permissions';
import { WHATSAPP_CRM_ENABLED } from '@/config/whatsapp-crm-config';
import { getRequiredResource, CONFIG_TAB_PREMIUM_MODULES } from '@/config/pageResources';
import UpgradeRequiredModal from '@/components/UpgradeRequiredModal';

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

export default function RoutePermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const router = useRouter();
  const { usuarioData, userDataReady } = useAuth();
  const { temRecurso, loading: subscriptionLoading } = useSubscription();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [blockedResource, setBlockedResource] = useState<string | null>(null);
  const hasVerifiedOnceRef = useRef(false);

  useEffect(() => {
    setBlockedResource(null);

    if (isAdminRoute(pathname) || isPublicPath(pathname)) {
      setAllowed(true);
      hasVerifiedOnceRef.current = true;
      return;
    }

    if (!userDataReady) return;

    if (subscriptionLoading && !hasVerifiedOnceRef.current) return;

    if (!usuarioData) {
      setAllowed(true);
      hasVerifiedOnceRef.current = true;
      return;
    }

    const nivel = usuarioData.nivel;
    const rawPermissoes = usuarioData.permissoes;

    if (!checkRouteAccess(pathname, nivel, rawPermissoes)) {
      setAllowed(false);
      router.replace(getHomePathForUser(nivel, rawPermissoes));
      return;
    }

    const requiredFromPath = getRequiredResource(pathname);
    if (requiredFromPath && !temRecurso(requiredFromPath)) {
      setBlockedResource(requiredFromPath);
      setAllowed(false);
      return;
    }

    if (pathname === '/configuracoes' || pathname.startsWith('/configuracoes')) {
      const tabParam = searchParams.get('tab');
      if (tabParam !== null) {
        const tabIndex = Number(tabParam);
        const tabPerm = CONFIG_TAB_PERMISSIONS[tabIndex];
        const premiumMod = CONFIG_TAB_PREMIUM_MODULES[tabIndex];

        if (tabPerm === 'whatsapp' && !WHATSAPP_CRM_ENABLED) {
          setAllowed(false);
          router.replace(getHomePathForUser(nivel, rawPermissoes));
          return;
        }

        if (premiumMod && !temRecurso(premiumMod)) {
          setBlockedResource(premiumMod);
          setAllowed(false);
          return;
        }

        if (tabPerm && !canUseModule(tabPerm, nivel, rawPermissoes)) {
          setAllowed(false);
          router.replace(getHomePathForUser(nivel, rawPermissoes));
          return;
        }
      }
    }

    setAllowed(true);
    hasVerifiedOnceRef.current = true;
  }, [
    pathname,
    searchParams,
    usuarioData,
    userDataReady,
    subscriptionLoading,
    temRecurso,
    router,
  ]);

  if (isAdminRoute(pathname) || isPublicPath(pathname)) {
    return <>{children}</>;
  }

  const showInitialLoader =
    !hasVerifiedOnceRef.current &&
    (!userDataReady || subscriptionLoading || allowed === null);

  if (showInitialLoader) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
        <p className="text-sm text-gray-500">Verificando permissões...</p>
      </div>
    );
  }

  if (blockedResource) {
    return <UpgradeRequiredModal resource={blockedResource} />;
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
