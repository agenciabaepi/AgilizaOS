'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const useQuickAuthCheck = () => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const quickCheck = async () => {
      try {
        // Verificação super rápida de sessão
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Quick auth timeout')), 1000)
          )
        ]) as any;

        if (error || !session) {
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
          
          // Redirecionar imediatamente para login
          setTimeout(() => {
            router.replace('/login');
          }, 100);
          
          return;
        }

        setIsAuthenticated(true);
        setIsCheckingAuth(false);

      } catch (error) {
        console.warn('⚠️ Quick auth check falhou - assumindo não logado');
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        
        // Redirecionar por segurança
        setTimeout(() => {
          router.replace('/login');
        }, 100);
      }
    };

    quickCheck();
  }, [router]);

  return {
    isCheckingAuth,
    isAuthenticated
  };
};
