'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface AuthGuardFinalProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallbackPath?: string;
}

/**
 * AuthGuard Final - Versão otimizada sem loops
 * Redirecionamento rápido mas seguro
 */
export default function AuthGuardFinal({ 
  children, 
  fallbackPath = '/dashboard' 
}: AuthGuardFinalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { usuarioData, empresaData, loading: authContextLoading, userDataReady } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Evitar múltiplas execuções
    if (isRedirecting) return;
    
    console.log('⚡ AuthGuardFinal: Verificação...');
    
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📊 AuthGuardFinal: Sessão:', !!session);
        
        if (!session) {
          console.log('🚫 AuthGuardFinal: Redirecionando...');
          setIsRedirecting(true);
          
          // Pequeno delay para evitar loops
          setTimeout(() => {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          }, 50);
          
          return;
        }

        // Se AuthContext ainda carregando, aguardar até 2s depois liberar
        if (authContextLoading) {
          setTimeout(checkAuth, 100);
          return;
        }

        // Só bloquear se empresaData já carregou e está desativada
        if (empresaData && empresaData.ativo === false) {
          console.log('🚫 AuthGuardFinal: Empresa desativada, redirecionando');
          setIsRedirecting(true);
          supabase.auth.signOut().then(() => {
            router.replace('/empresa-desativada');
          }).catch((e) => {
            console.error('Erro ao fazer logout:', e);
            router.replace('/empresa-desativada');
          });
          return;
        }

        // Plano único - sem verificação de permissão
        
        // Se tem sessão, autorizar
        console.log('✅ AuthGuardFinal: Autorizado!');
        setIsAuthorized(true);
        
      } catch (err) {
        console.error('❌ AuthGuardFinal: Erro:', err);
        setIsRedirecting(true);
        setTimeout(() => {
          router.replace('/login');
        }, 50);
      }
    };

    checkAuth();
    
    // Timeout de segurança - 5s (evitar redirect prematuro enquanto getSession carrega)
    const timeout = setTimeout(() => {
      if (!isAuthorized && !isRedirecting) {
        setIsRedirecting(true);
        router.replace('/login');
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [isAuthorized, isRedirecting, pathname, router, fallbackPath, usuarioData, empresaData, authContextLoading, userDataReady]);

  // Se está redirecionando, não renderizar nada
  if (isRedirecting) {
    return null;
  }

  // Se não está autorizado, não renderizar nada
  if (!isAuthorized) {
    return null;
  }

  // Se está autorizado, renderizar conteúdo
  return <>{children}</>;
}
