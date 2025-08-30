'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getRequiredPermission } from '@/config/pagePermissions';

interface AutoRouteProtectionProps {
  children: React.ReactNode;
}

export default function AutoRouteProtection({ children }: AutoRouteProtectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuarioData, loading } = useAuth();

  useEffect(() => {
    // Se ainda está carregando, aguarda
    if (loading) return;

    // Se não há dados do usuário, redireciona para login
    if (!usuarioData) {
      router.replace('/login');
      return;
    }

    // Obtém a permissão necessária para a rota atual
    const requiredPermission = getRequiredPermission(pathname);
    
    // Se não precisa de proteção, permite acesso
    if (!requiredPermission) {
      return;
    }

    // Verifica se o usuário tem a permissão necessária
    const hasPermission = checkPermission(usuarioData, requiredPermission);
    
    if (!hasPermission) {
      // Bloqueia acesso instantaneamente
      console.log(`🚫 Acesso negado: ${pathname} - Permissão necessária: ${requiredPermission}`);
      router.replace('/dashboard');
      return;
    }
  }, [pathname, usuarioData, loading, router]);

  // Função para verificar permissão
  const checkPermission = (user: any, permission: string): boolean => {
    // Usuários de teste têm acesso total
    if (user.nivel === 'usuarioteste') return true;
    
    // Administradores têm acesso total
    if (user.nivel === 'admin') return true;
    
    // Verifica se a permissão está na lista de permissões do usuário
    return user.permissoes && user.permissoes.includes(permission);
  };

  // Se ainda está carregando, mostra loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não há dados do usuário, não renderiza nada (será redirecionado)
  if (!usuarioData) {
    return null;
  }

  // Renderiza o conteúdo
  return <>{children}</>;
}
