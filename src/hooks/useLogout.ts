import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useLogout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return; // Evitar múltiplas execuções
    
    setIsLoggingOut(true);
    
    // Timeout de segurança para o processo completo
    const logoutTimeout = setTimeout(() => {
      console.log('🚨 Timeout no logout - forçando redirecionamento');
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    }, 3000); // 3 segundos máximo

    try {
      // 1. Logout do Supabase com timeout
      const logoutPromise = supabase.auth.signOut({ scope: 'global' });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 2000)
      );
      
      try {
        const { error } = await Promise.race([logoutPromise, timeoutPromise]) as any;
        if (error) {
          console.warn('Erro no logout do Supabase:', error);
        }
      } catch (timeoutError) {
        console.warn('Timeout no logout do Supabase - continuando...');
      }

      // 2. Limpeza rápida e paralela
      const cleanupPromises = [
        // Limpar localStorage
        new Promise<void>((resolve) => {
          try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('supabase') || key.includes('auth') || key === 'user' || key === 'empresa_id' || key === 'session')) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            resolve();
          } catch (error) {
            console.warn('Erro ao limpar localStorage:', error);
            resolve();
          }
        }),
        
        // Limpar sessionStorage
        new Promise<void>((resolve) => {
          try {
            sessionStorage.clear();
            resolve();
          } catch (error) {
            console.warn('Erro ao limpar sessionStorage:', error);
            resolve();
          }
        }),
        
        // Limpar cookies
        new Promise<void>((resolve) => {
          try {
            const cookies = document.cookie.split(";");
            cookies.forEach(cookie => {
              const eqPos = cookie.indexOf("=");
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
              
              if (name.includes('supabase') || name.includes('sb-') || name.includes('auth')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
              }
            });
            resolve();
          } catch (error) {
            console.warn('Erro ao limpar cookies:', error);
            resolve();
          }
        })
      ];

      // Aguardar limpeza com timeout
      await Promise.race([
        Promise.all(cleanupPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), 1000))
      ]).catch(() => {
        console.warn('Timeout na limpeza - continuando...');
      });

      // 3. Redirecionamento imediato
      clearTimeout(logoutTimeout);
      window.location.replace('/login');

    } catch (error) {
      console.error('Erro no logout:', error);
      
      // Fallback: limpeza total e redirecionamento
      clearTimeout(logoutTimeout);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/login');
    }
  };

  return {
    logout,
    isLoggingOut
  };
};
