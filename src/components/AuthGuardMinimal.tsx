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
    console.log('🚀 AuthGuardMinimal: Iniciando verificação...');
    
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📊 AuthGuardMinimal: Sessão encontrada:', !!session);
        console.log('📊 AuthGuardMinimal: Erro:', error?.message || 'Nenhum');
        
        if (!session) {
          console.log('🚫 AuthGuardMinimal: Redirecionando para login...');
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return; // Não renderizar nada se vai redirecionar
        } else {
          console.log('✅ AuthGuardMinimal: Sessão válida!');
          setIsChecking(false); // Permitir renderização
        }
      } catch (err) {
        console.error('❌ AuthGuardMinimal: Erro:', err);
        router.replace('/login');
      }
    };

    // Executar imediatamente
    checkAuth();
    
    // Timeout de segurança reduzido
    const timeout = setTimeout(() => {
      if (isChecking) {
        console.log('⚠️ AuthGuardMinimal: Timeout - redirecionando...');
        router.replace('/login');
      }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, []);

  // Se está verificando, não renderizar nada
  if (isChecking) {
    return null;
  }

  // Se chegou até aqui, renderizar o conteúdo
  return <>{children}</>;
}
