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
        console.log('🔍 AuthGuardTest: Verificando autenticação...');
        
        // Verificar sessão do Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📊 AuthGuardTest: Resultado da verificação:', {
          hasSession: !!session,
          hasError: !!error,
          error: error?.message
        });

        // Se não há sessão, redirecionar para login
        if (error || !session) {
          console.log('🚫 AuthGuardTest: Sem sessão válida, redirecionando para login');
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        // Se há sessão, permitir acesso
        console.log('✅ AuthGuardTest: Sessão válida, permitindo acesso');
        setIsChecking(false);

      } catch (error) {
        console.error('❌ AuthGuardTest: Erro na verificação:', error);
        router.replace('/login');
      }
    };

    // Timeout de segurança
    const timeout = setTimeout(() => {
      if (isChecking) {
        console.log('⚠️ AuthGuardTest: Timeout - redirecionando para login');
        router.replace('/login');
      }
    }, 2000);

    checkAuth();

    return () => clearTimeout(timeout);
  }, [pathname, router]);

  // Enquanto está verificando
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

  // Se chegou até aqui, está autorizado
  return <>{children}</>;
}
