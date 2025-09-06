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
    checkInterval = 60000, // Verificar a cada 1 minuto (PRODUÇÃO)
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
      // 1. Mostrar toast de aviso ANTES de bloquear
      addToast('error', `Sessão encerrada por ${reason.toLowerCase()}. Redirecionando...`);
      
      // 2. Bloquear interface IMEDIATAMENTE
      document.body.style.pointerEvents = 'none';
      document.body.style.opacity = '0.5';
      document.body.style.cursor = 'wait';
      
      // 3. Criar overlay de bloqueio
      const overlay = document.createElement('div');
      overlay.id = 'logout-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 18px;
        font-family: system-ui;
      `;
      overlay.innerHTML = `
        <div style="text-align: center;">
          <div style="width: 40px; height: 40px; border: 3px solid #fff; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
          <div>Sessão encerrada. Redirecionando para login...</div>
        </div>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      `;
      document.body.appendChild(overlay);
      
      // 4. Limpar dados e fazer logout
      await clearAllAuthData();
      await supabase.auth.signOut({ scope: 'global' });
      
      // 5. Limpar storage adicional
      localStorage.clear();
      sessionStorage.clear();
      
      // 6. FORÇAR redirecionamento múltiplo
      setTimeout(() => {
        // Tentar router primeiro
        try {
          router.replace('/login');
        } catch (e) {
          console.warn('Router falhou, usando window.location');
        }
        
        // Backup com window.location após 500ms
        setTimeout(() => {
          window.location.replace('/login');
        }, 500);
        
        // Último recurso após 1s
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }, 1000);
      
    } catch (error) {
      console.error('Erro no logout forçado:', error);
      // FORÇAR redirecionamento mesmo com erro
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;">Redirecionando para login...</div>';
      setTimeout(() => {
        window.location.replace('/login');
      }, 500);
    }
  }, [addToast, router]);

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
