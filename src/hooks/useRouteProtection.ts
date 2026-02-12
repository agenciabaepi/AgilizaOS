import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface UseRouteProtectionOptions {
  requiredPermission: string;
  fallbackPath?: string;
  redirectOnNoPermission?: boolean;
}

export function useRouteProtection({
  requiredPermission,
  fallbackPath = '/dashboard',
  redirectOnNoPermission = true
}: UseRouteProtectionOptions) {
  const router = useRouter();
  const { usuarioData, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    // Se ainda está carregando, aguarda
    if (loading) return;

    // Se não há dados do usuário, não tem acesso
    if (!usuarioData) {
      setHasAccess(false);
      if (redirectOnNoPermission) {
        router.replace('/login');
      }
      return;
    }

    // Plano único - todos têm acesso
    setHasAccess(true);
  }, [usuarioData, loading, requiredPermission, fallbackPath, redirectOnNoPermission, router]);

  return {
    hasAccess,
    loading,
    usuarioData,
    checkPermission: (_permission: string) => true
  };
}
