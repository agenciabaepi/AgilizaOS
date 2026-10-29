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
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        
        setIsAuthorized(true);
        
      } catch (err) {
        console.error('❌ AuthGuardInstant: Erro:', err);
        router.replace('/login');
      }
    };

    checkAuth();
    
    const timeout = setTimeout(() => {
      if (!isAuthorized) {
        router.replace('/login');
      }
    }, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
