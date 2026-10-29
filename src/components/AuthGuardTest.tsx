'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface AuthGuardTestProps {
  children: React.ReactNode;
}

/**
 * AuthGuard de Teste - Versão ultra simples
 * Apenas verifica se há sessão válida no Supabase
 */
export default function AuthGuardTest({ children }: AuthGuardTestProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        setIsChecking(false);

      } catch (error) {
        console.error('❌ AuthGuardTest: Erro na verificação:', error);
        router.replace('/login');
      }
    };

    const timeout = setTimeout(() => {
      if (isChecking) {
        router.replace('/login');
      }
    }, 2000);

    checkAuth();

    return () => clearTimeout(timeout);
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
