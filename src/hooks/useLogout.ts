import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useLogout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return; // Evitar múltiplas execuções
    
    setIsLoggingOut(true);
    console.log('🔴 useLogout: Iniciando processo de logout');

    try {
      // 1. Pegar tokens atuais antes de limpar
      const { data: { session } } = await supabase.auth.getSession();
      const access_token = session?.access_token;
      const refresh_token = session?.refresh_token;
      const user_id = session?.user?.id;

      console.log('🔴 useLogout: Tokens obtidos', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        hasUserId: !!user_id
      });

      // 2. Limpar estado local imediatamente
      localStorage.clear();
      sessionStorage.clear();
      console.log('🔴 useLogout: Estado local limpo');

      // 3. Fazer logout do Supabase
      console.log('🔴 useLogout: Fazendo logout do Supabase...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('⚠️ useLogout: Erro no logout Supabase:', error.message);
      } else {
        console.log('✅ useLogout: Logout Supabase realizado');
      }

      // 4. Forçar logout no backend (opcional)
      if (access_token && user_id) {
        try {
          console.log('🔴 useLogout: Forçando logout no backend...');
          
          const response = await fetch('/api/auth/force-logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              access_token, 
              refresh_token, 
              user_id 
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ useLogout: Logout forçado no backend realizado:', result);
          } else {
            const error = await response.text();
            console.log('⚠️ useLogout: Erro no logout forçado do backend:', error);
          }
        } catch (apiError) {
          console.log('⚠️ useLogout: Erro ao chamar API de logout forçado:', apiError);
        }
      }

      // 5. Limpeza final
      localStorage.clear();
      sessionStorage.clear();
      
      // 6. Redirecionar para login
      console.log('🔄 useLogout: Redirecionando para login...');
      window.location.href = '/login';

    } catch (error) {
      console.error('❌ useLogout: Erro no logout:', error);
      
      // Mesmo com erro, forçar redirecionamento
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } finally {
      // Timeout de segurança - se algo der errado, forçar redirecionamento
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          console.log('⚠️ useLogout: Timeout de segurança - forçando redirecionamento');
          window.location.href = '/login';
        }
      }, 5000);
    }
  };

  return {
    logout,
    isLoggingOut
  };
};
