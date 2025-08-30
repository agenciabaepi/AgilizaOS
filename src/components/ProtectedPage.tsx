'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedPageProps {
  children: React.ReactNode;
  requiredPermission: string;
  fallbackPath?: string;
  showLoading?: boolean;
  loadingMessage?: string;
}

export default function ProtectedPage({
  children,
  requiredPermission,
  fallbackPath = '/dashboard',
  showLoading = true,
  loadingMessage = 'Verificando permissões...'
}: ProtectedPageProps) {
  const router = useRouter();
  const { usuarioData, loading } = useAuth();
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    // Se ainda está carregando dados do usuário, aguarda
    if (loading) return;

    // Se não há dados do usuário, redireciona para login
    if (!usuarioData) {
      router.replace('/login');
      return;
    }

    // Verifica permissão
    const hasPermission = checkPermission(usuarioData, requiredPermission);
    
    if (!hasPermission) {
      // Bloqueia acesso instantaneamente
      router.replace(fallbackPath);
      return;
    }

    // Marca que o acesso foi verificado e permitido
    setAccessChecked(true);
  }, [usuarioData, loading, requiredPermission, fallbackPath, router]);

  // Função para verificar permissão
  const checkPermission = (user: any, permission: string): boolean => {
    // Usuários de teste têm acesso total
    if (user.nivel === 'usuarioteste') return true;
    
    // Administradores têm acesso total
    if (user.nivel === 'admin') return true;
    
    // Verifica se a permissão está na lista de permissões do usuário
    return user.permissoes && user.permissoes.includes(permission);
  };

  // Se ainda está carregando dados do usuário
  if (loading) {
    return showLoading ? (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    ) : null;
  }

  // Se não há dados do usuário, não renderiza nada (será redirecionado)
  if (!usuarioData) {
    return null;
  }

  // Se o acesso ainda não foi verificado, não renderiza nada
  if (!accessChecked) {
    return showLoading ? (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{loadingMessage}</p>
        </div>
      </div>
    ) : null;
  }

  // Se tem permissão, renderiza o conteúdo
  return <>{children}</>;
}
