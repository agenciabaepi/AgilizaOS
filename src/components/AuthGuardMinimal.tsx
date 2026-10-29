'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface AuthGuardMinimalProps {
  children: React.ReactNode;
}

/**
 * AuthGuard Minimal - Versão ultra básica para debug
 */
export default function AuthGuardMinimal({ children }: AuthGuardMinimalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        setIsChecking(false);
      } catch (err) {
        console.error('❌ AuthGuardMinimal: Erro:', err);
        router.replace('/login');
      }
    };

    checkAuth();
    
    const timeout = setTimeout(() => {
      if (isChecking) {
        router.replace('/login');
      }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, []);

  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}
