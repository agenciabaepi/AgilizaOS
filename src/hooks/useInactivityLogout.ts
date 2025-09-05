'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import { clearAllAuthData } from '@/utils/authUtils';

interface InactivityOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  checkInterval?: number;
  enabled?: boolean;
}

export const useInactivityLogout = (options: InactivityOptions = {}) => {
  const {
    timeoutMinutes = 30, // 30 minutos de inatividade
    warningMinutes = 5,  // Avisar 5 minutos antes
    checkInterval = 5000, // Verificar a cada 5 segundos (TESTE)
    enabled = true
  } = options;

  const { user, session } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const isLoggingOutRef = useRef<boolean>(false);

  // ✅ Função para forçar logout completo
  const forceLogout = useCallback(async (reason: string = 'Inatividade') => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    console.warn(`🚨 LOGOUT FORÇADO: ${reason}`);
    
    try {
      // 1. Limpar todos os dados locais
      await clearAllAuthData();
      
      // 2. Fazer logout no Supabase
      await supabase.auth.signOut();
      
      // 3. Mostrar toast de aviso
      addToast('warning', `Sessão encerrada por ${reason.toLowerCase()}`);
      
      // 4. Redirecionar para login após um pequeno delay
      setTimeout(() => {
        window.location.replace('/login');
      }, 1000);
      
    } catch (error) {
      console.error('Erro no logout forçado:', error);
      // Forçar redirecionamento mesmo com erro
      window.location.replace('/login');
    }
  }, [addToast]);

  // ✅ Função para atualizar atividade
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // ✅ Verificar inatividade
  const checkInactivity = useCallback(() => {
    if (!enabled || !user || !session) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

    // Mostrar aviso antes do logout
    if (timeSinceActivity >= warningMs && !warningShownRef.current) {
      warningShownRef.current = true;
      addToast('warning', `Sua sessão expirará em ${warningMinutes} minutos por inatividade`);
      console.warn(`⚠️ Aviso de inatividade: ${warningMinutes} minutos restantes`);
    }

    // Forçar logout por inatividade
    if (timeSinceActivity >= timeoutMs) {
      forceLogout('Inatividade');
    }
  }, [enabled, user, session, timeoutMinutes, warningMinutes, addToast, forceLogout]);

  // ✅ Detectar atividade do usuário
  useEffect(() => {
    if (!enabled) return;

    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => updateActivity();

    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      // Remover listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [enabled, updateActivity]);

  // ✅ Monitor periódico de inatividade
  useEffect(() => {
    if (!enabled || !user || !session) return;

    // Verificar imediatamente
    checkInactivity();
    
    // Verificar periodicamente
    intervalRef.current = setInterval(checkInactivity, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, user, session, checkInterval, checkInactivity]);

  // ✅ Detectar se a sessão foi invalidada externamente
  useEffect(() => {
    if (!enabled) return;

    const checkSessionValidity = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error || !currentSession) {
          console.warn('🚨 Sessão inválida detectada:', error?.message);
          forceLogout('Sessão inválida');
          return;
        }

        // Verificar se a sessão expirou
        const now = Math.floor(Date.now() / 1000);
        if (currentSession.expires_at && currentSession.expires_at < now) {
          console.warn('🚨 Sessão expirada detectada');
          forceLogout('Sessão expirada');
        }
      } catch (error) {
        console.error('Erro ao verificar validade da sessão:', error);
        forceLogout('Erro de sessão');
      }
    };

    // Verificar validade da sessão periodicamente
    const sessionCheckInterval = setInterval(checkSessionValidity, 5 * 60 * 1000); // A cada 5 minutos

    return () => clearInterval(sessionCheckInterval);
  }, [enabled, forceLogout]);

  // ✅ Listener para mudanças de visibilidade da página
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Página voltou a ficar visível - verificar sessão
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, updateActivity]);

  return {
    updateActivity,
    forceLogout,
    timeRemaining: () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      return Math.max(0, timeoutMs - timeSinceActivity);
    }
  };
};
