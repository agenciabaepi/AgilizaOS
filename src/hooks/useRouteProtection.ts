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

    // Verifica permissão
    const permissionGranted = checkPermission(usuarioData, requiredPermission);
    setHasAccess(permissionGranted);

    // Se não tem permissão e deve redirecionar
    if (!permissionGranted && redirectOnNoPermission) {
      router.replace(fallbackPath);
    }
  }, [usuarioData, loading, requiredPermission, fallbackPath, redirectOnNoPermission, router]);

  // Função para verificar permissão
  const checkPermission = (user: any, permission: string): boolean => {
    // Usuários de teste têm acesso total
    if (user.nivel === 'usuarioteste') return true;
    
    // Administradores têm acesso total
    if (user.nivel === 'admin') return true;
    
    // Verifica se a permissão está na lista de permissões do usuário
    return user.permissoes && user.permissoes.includes(permission);
  };

  return {
    hasAccess,
    loading,
    usuarioData,
    checkPermission: (permission: string) => usuarioData ? checkPermission(usuarioData, permission) : false
  };
}
