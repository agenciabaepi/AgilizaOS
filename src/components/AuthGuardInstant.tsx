'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface AuthGuardInstantProps {
  children: React.ReactNode;
}

/**
 * AuthGuard Instant - Redirecionamento instantâneo
 * Prioriza velocidade máxima sobre loading states
 */
export default function AuthGuardInstant({ children }: AuthGuardInstantProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    console.log('⚡ AuthGuardInstant: Verificação instantânea...');
    
    const checkAuth = async () => {
      try {
        // Verificação mais rápida possível
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📊 AuthGuardInstant: Sessão:', !!session);
        
        if (!session) {
          console.log('🚫 AuthGuardInstant: Redirecionamento instantâneo...');
          // Usar router.replace para evitar loops
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        
        // Se tem sessão, autorizar imediatamente
        console.log('✅ AuthGuardInstant: Autorizado!');
        setIsAuthorized(true);
        
      } catch (err) {
        console.error('❌ AuthGuardInstant: Erro:', err);
        router.replace('/login');
      }
    };

    // Executar imediatamente
    checkAuth();
    
    // Timeout ultra curto apenas como backup
    const timeout = setTimeout(() => {
      if (!isAuthorized) {
        console.log('⚠️ AuthGuardInstant: Timeout - redirecionando...');
        router.replace('/login');
      }
    }, 100); // Apenas 100ms de backup
    
    return () => clearTimeout(timeout);
  }, []);

  // Se não está autorizado, não renderizar nada
  if (!isAuthorized) {
    return null;
  }

  // Se está autorizado, renderizar conteúdo
  return <>{children}</>;
}
