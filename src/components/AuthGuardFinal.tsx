'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface AuthGuardFinalProps {
  children: React.ReactNode;
}

/**
 * AuthGuard Final - Versão otimizada sem loops
 * Redirecionamento rápido mas seguro
 */
export default function AuthGuardFinal({ children }: AuthGuardFinalProps) {
  const router = useRouter();
  const pathname = usePathname();
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
    
    // Timeout de segurança
    const timeout = setTimeout(() => {
      if (!isAuthorized && !isRedirecting) {
        console.log('⚠️ AuthGuardFinal: Timeout...');
        setIsRedirecting(true);
        router.replace('/login');
      }
    }, 200);
    
    return () => clearTimeout(timeout);
  }, [isAuthorized, isRedirecting, pathname, router]);

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
