'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface AuthGuardSimpleProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallbackPath?: string;
  showLoading?: boolean;
}

/**
 * AuthGuard Simplificado - Versão mais robusta
 * Foca em verificação rápida de sessão sem depender muito do AuthContext
 */
export default function AuthGuardSimple({
  children,
  fallbackPath = '/dashboard',
  showLoading = true,
}: AuthGuardSimpleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, usuarioData, empresaData, userDataReady } = useAuth();
  
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        // Passo 1: Verificar sessão do Supabase diretamente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        // Se não há sessão, redirecionar para login IMEDIATAMENTE
        if (error || !session) {
          console.log('🚫 AuthGuardSimple: Sem sessão válida, redirecionando para login');
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        // Passo 2: Aguardar dados completos (evita redirect ao atualizar - AuthContext usa dados temporários)
        if (!userDataReady || !usuarioData || !empresaData?.id) {
          console.log('⏳ AuthGuardSimple: Aguardando dados do usuário...');
          
          // Aguarda até 2 segundos pelos dados do usuário
          let attempts = 0;
          const maxAttempts = 20; // 20 tentativas de 100ms = 2 segundos
          
          const waitForUserData = () => {
            if (!isMounted) return;
            
            attempts++;
            
            if (usuarioData?.empresa_id && empresaData?.id) {
              // ⚠️ BLOQUEAR ACESSO: Verificar se empresa está ativa
              if (empresaData.ativo === false) {
                console.log('🚫 AuthGuardSimple: Empresa desativada, redirecionando');
                supabase.auth.signOut().then(() => {
                  router.replace('/empresa-desativada');
                }).catch((e) => {
                  console.error('Erro ao fazer logout:', e);
                  router.replace('/empresa-desativada');
                });
                return;
              }
              
              // Dados carregaram, verificar permissão
              checkPermissionAndAuthorize();
            } else if (attempts >= maxAttempts) {
              // Timeout: redirecionar para login
              console.log('⚠️ AuthGuardSimple: Timeout aguardando dados do usuário');
              router.replace('/login');
            } else {
              // Aguardar mais um pouco
              setTimeout(waitForUserData, 100);
            }
          };
          
          waitForUserData();
          return;
        }

        // Passo 3: Dados do usuário disponíveis, verificar permissão
        checkPermissionAndAuthorize();

      } catch (error) {
        console.error('❌ AuthGuardSimple: Erro na verificação:', error);
        if (isMounted) {
          router.replace('/login');
        }
      }
    };

    const checkPermissionAndAuthorize = () => {
      if (!isMounted) return;

      // ⚠️ BLOQUEAR ACESSO: Verificar se empresa está ativa
      if (empresaData && empresaData.ativo === false) {
        console.log('🚫 AuthGuardSimple: Empresa desativada, redirecionando');
        supabase.auth.signOut().then(() => {
          router.replace('/empresa-desativada');
        });
        return;
      }

      // Plano único - sem verificação de permissão

      // Tudo OK, autorizar acesso
      if (isMounted) {
        setIsAuthorized(true);
        setIsChecking(false);
      }
    };

    // Timeout de segurança geral - 3 segundos
    const safetyTimeout = setTimeout(() => {
      if (isMounted && isChecking) {
        console.log('⚠️ AuthGuardSimple: Timeout de segurança geral');
        router.replace('/login');
      }
    }, 3000);

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [user, usuarioData, empresaData, userDataReady, fallbackPath, pathname, router]);

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
