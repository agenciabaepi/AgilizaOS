'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface AuthGuardProps {
  children: React.ReactNode;
  /** @deprecated Plano único - não utilizado */
  requiredPermission?: string;
  fallbackPath?: string;
  showLoading?: boolean;
}

/**
 * AuthGuard - Proteção por autenticação (sessão + empresa ativa).
 * Plano único R$119,90 - todos os usuários logados têm acesso total.
 */
export default function AuthGuard({
  children,
  fallbackPath = '/dashboard',
  showLoading = true,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { usuarioData, empresaData, loading: authLoading, userDataReady } = useAuth();
  
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

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

        // Passo 2: Se ainda carregando dados do usuário, rechecar em 100ms (máx ~2.5s depois liberar com sessão)
        if (authLoading) {
          timeoutId = setTimeout(() => checkAuth(), 100);
          return;
        }

        // Se temos empresaData, verificar se está ativa
        if (empresaData && empresaData.ativo === false) {
          console.log('🚫 AuthGuard: Empresa desativada, redirecionando');
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('Erro ao fazer logout:', e);
          }
          router.replace('/empresa-desativada');
          return;
        }

        // Plano único - sem verificação de permissão ou recurso

        // Tudo OK, autorizar acesso
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

    // Timeout de segurança: após 3s, se ainda verificando, tentar obter sessão uma vez e liberar ou ir para login
    const safetyTimeout = setTimeout(async () => {
      if (!isMounted || !isChecking) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (isMounted) {
          setIsAuthorized(true);
          setIsChecking(false);
        }
      } else {
        router.replace('/login');
      }
    }, 3000);

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearTimeout(safetyTimeout);
    };
  }, [usuarioData, empresaData, authLoading, userDataReady, fallbackPath, pathname, router]);

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

  // Se não está autorizado, não mostra nada (já está redirecionando)
  if (!isAuthorized) {
    return null;
  }

  // Se está autorizado, mostra o conteúdo
  return <>{children}</>;
}
