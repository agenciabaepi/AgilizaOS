'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { getRequiredResource } from '@/config/pageResources';
import { useSubscription } from '@/hooks/useSubscription';
import UpgradeRequiredModal from '@/components/UpgradeRequiredModal';

interface AuthGuardProps {
  children: React.ReactNode;
  /**
   * Permissão necessária para acessar a página
   * Se não fornecida, apenas verifica se está autenticado
   */
  requiredPermission?: string;
  /**
   * Caminho para redirecionar caso não tenha permissão
   * Padrão: '/dashboard'
   */
  fallbackPath?: string;
  /**
   * Se true, mostra loading enquanto verifica autenticação
   * Padrão: true
   */
  showLoading?: boolean;
}

/**
 * AuthGuard - Componente de proteção de rotas
 * 
 * Uso:
 * ```tsx
 * <AuthGuard requiredPermission="ordens">
 *   <ConteudoDaPagina />
 * </AuthGuard>
 * ```
 * 
 * Features:
 * - ✅ Verifica autenticação do Supabase
 * - ✅ Verifica permissões do usuário
 * - ✅ Loading states durante verificação
 * - ✅ Redirecionamento automático
 * - ✅ Previne flash de conteúdo não autorizado
 */
export default function AuthGuard({
  children,
  requiredPermission,
  fallbackPath = '/dashboard',
  showLoading = true,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, usuarioData, empresaData, loading: authLoading } = useAuth();
  const { temRecurso, loading: subscriptionLoading } = useSubscription();
  
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [missingResource, setMissingResource] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const checkAuth = async () => {
      try {
        // Passo 1: Verificar sessão do Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        // Se não há sessão, redirecionar para login
        if (error || !session) {
          console.log('🚫 AuthGuard: Sem sessão válida, redirecionando para login');
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        // Passo 2: Aguardar dados do usuário do contexto com timeout
        if (authLoading) {
          timeoutId = setTimeout(() => checkAuth(), 100);
          return;
        }

        // Passo 3: Verificar se há dados do usuário com timeout de segurança
        if (!usuarioData || !empresaData) {
          console.log('⏳ AuthGuard: Aguardando dados do usuário...');
          timeoutId = setTimeout(() => checkAuth(), 100);
          return;
        }

        // ⚠️ BLOQUEAR ACESSO: Verificar se empresa está ativa
        if (empresaData && empresaData.ativo === false) {
          console.log('🚫 AuthGuard: Empresa desativada, redirecionando para login');
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('Erro ao fazer logout:', e);
          }
          router.replace('/login?error=empresa_desativada');
          return;
        }

        // Passo 4: Verificar permissão se necessário
        if (requiredPermission) {
          const hasPermission = checkPermission(usuarioData, requiredPermission);
          
          if (!hasPermission) {
            console.log(`🚫 AuthGuard: Usuário não tem permissão '${requiredPermission}'`);
            router.replace(fallbackPath);
            return;
          }
        }

        // Passo 5: Verificar recurso do plano se necessário
        const requiredResource = getRequiredResource(pathname);
        if (requiredResource) {
          // Aguardar carregamento da assinatura
          if (subscriptionLoading) {
            timeoutId = setTimeout(() => checkAuth(), 100);
            return;
          }

          const hasResource = temRecurso(requiredResource);
          
          if (!hasResource) {
            console.log(`🚫 AuthGuard: Plano não tem acesso ao recurso '${requiredResource}'`);
            if (isMounted) {
              setMissingResource(requiredResource);
              setIsChecking(false);
            }
            return;
          }
        }

        // Passo 6: Tudo OK, autorizar acesso
        if (isMounted) {
          setIsAuthorized(true);
          setIsChecking(false);
        }

      } catch (error) {
        console.error('❌ AuthGuard: Erro na verificação:', error);
        if (isMounted) {
          router.replace('/login');
        }
      }
    };

    // Timeout de segurança para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      if (isMounted && isChecking) {
        console.log('⚠️ AuthGuard: Timeout de segurança - redirecionando para login');
        router.replace('/login');
      }
    }, 5000); // 5 segundos de timeout

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearTimeout(safetyTimeout);
    };
  }, [user, usuarioData, empresaData, authLoading, requiredPermission, fallbackPath, pathname, router, temRecurso, subscriptionLoading]);

  /**
   * Verifica se o usuário tem a permissão necessária
   */
  const checkPermission = (userData: any, permission: string): boolean => {
    // Usuários de teste têm acesso total
    if (userData.nivel === 'usuarioteste') {
      return true;
    }
    
    // Administradores têm acesso total
    if (userData.nivel === 'admin') {
      return true;
    }
    
    // Técnicos sempre têm acesso ao dashboard
    if (permission === 'dashboard' && userData.nivel === 'tecnico') {
      return true;
    }

    // Atendentes sempre têm acesso ao dashboard
    if (permission === 'dashboard' && userData.nivel === 'atendente') {
      return true;
    }
    
    // Verifica se a permissão está na lista de permissões do usuário
    return userData.permissoes && userData.permissoes.includes(permission);
  };

  // Enquanto está verificando, mostra loading ou nada
  if (isChecking) {
    if (!showLoading) {
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner animado */}
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-[#D1FE6E] rounded-full animate-spin border-t-transparent"></div>
          </div>
          
          {/* Texto de loading */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-gray-600 font-medium">Verificando autenticação...</p>
            <p className="text-gray-400 text-sm">Por favor, aguarde</p>
          </div>
        </div>
      </div>
    );
  }

  // Se não tem recurso necessário, mostra modal de upgrade
  if (missingResource) {
    return <UpgradeRequiredModal resource={missingResource} onClose={() => router.push(fallbackPath)} />;
  }

  // Se não está autorizado, não mostra nada (já está redirecionando)
  if (!isAuthorized) {
    return null;
  }

  // Se está autorizado, mostra o conteúdo
  return <>{children}</>;
}
