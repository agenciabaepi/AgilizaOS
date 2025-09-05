'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import { checkAuthIssues, refreshAuthToken, clearAllAuthData } from '@/utils/authUtils';

interface SessionMonitorOptions {
  autoRefreshOnError?: boolean;
  refreshOnNavigation?: boolean;
  checkInterval?: number;
}

export const useSessionMonitor = (options: SessionMonitorOptions = {}) => {
  const {
    autoRefreshOnError = true,
    refreshOnNavigation = true,
    checkInterval = 30000 // 30 segundos
  } = options;

  const { session, user } = useAuth();
  const { addToast } = useToast();
  const lastCheckRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  // ✅ Função para detectar e resolver problemas de sessão
  const handleSessionIssues = useCallback(async () => {
    try {
      const authStatus = await checkAuthIssues();
      
      if (authStatus.hasIssues) {
        console.warn('🚨 Problema de sessão detectado:', authStatus.error);
        
        if (autoRefreshOnError) {
          console.log('🔄 Tentando refresh automático...');
          const refreshed = await refreshAuthToken();
          
          if (refreshed) {
            console.log('✅ Sessão renovada com sucesso');
            addToast('success', 'Sessão renovada automaticamente');
            return true;
          } else {
            console.error('❌ Falha no refresh automático - BLOQUEANDO SISTEMA');
            addToast('error', 'Sessão expirada. Redirecionando para login...');
            
            // ✅ BLOQUEIO COMPLETO: Limpar dados e forçar logout
            await clearAllAuthData();
            await supabase.auth.signOut();
            
            // Bloquear interface e redirecionar
            document.body.style.pointerEvents = 'none';
            document.body.style.opacity = '0.5';
            
            setTimeout(() => {
              window.location.replace('/login');
            }, 1500);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      return false;
    }
  }, [autoRefreshOnError, addToast]);

  // ✅ Monitor periódico de sessão
  useEffect(() => {
    if (!session || !user) return;

    const checkSession = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < checkInterval) return;
      
      lastCheckRef.current = now;
      await handleSessionIssues();
    };

    // Verificar imediatamente
    checkSession();
    
    // Verificar periodicamente
    intervalRef.current = setInterval(checkSession, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session, user, checkInterval, handleSessionIssues]);

  // ✅ Listener robusto para erros de rede/autenticação
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      const message = error?.message || event.message || '';
      
      // Detectar erros críticos que indicam problemas de sessão
      const criticalErrors = [
        '404', '408', '401', '403',
        'Failed to fetch',
        'NetworkError',
        'Invalid Refresh Token',
        'Uncaught (in promise) Error',
        'the server responded with a status of 404',
        'the server responded with a status of 408',
        'A listener indicated an asynchronous response'
      ];
      
      if (criticalErrors.some(errorType => message.includes(errorType))) {
        console.warn('🚨 ERRO CRÍTICO detectado - verificando sessão:', message);
        handleSessionIssues();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || event.reason || '';
      
      if (
        message.includes('404') ||
        message.includes('408') ||
        message.includes('Failed to fetch') ||
        message.includes('Invalid Refresh Token')
      ) {
        console.warn('🚨 PROMISE REJECTION - problema de sessão:', message);
        handleSessionIssues();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleSessionIssues]);

  // ✅ Refresh automático ao focar na janela
  useEffect(() => {
    if (!refreshOnNavigation) return;

    const handleFocus = () => {
      console.log('🔍 Janela focada - verificando sessão...');
      handleSessionIssues();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshOnNavigation, handleSessionIssues]);

  // ✅ Interceptar erros do Supabase
  useEffect(() => {
    const originalError = console.error;
    
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      if (
        message.includes('the server responded with a status of 404') ||
        message.includes('the server responded with a status of 408') ||
        message.includes('A listener indicated an asynchronous response') ||
        message.includes('Uncaught (in promise)')
      ) {
        console.warn('🚨 Erro interceptado - verificando sessão:', message);
        handleSessionIssues();
      }
      
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, [handleSessionIssues]);

  return {
    refreshSession: handleSessionIssues
  };
};
