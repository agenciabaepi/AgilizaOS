'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

interface PageTimeoutOptions {
  maxLoadTime?: number; // Tempo máximo de carregamento (ms)
  forceRefreshAfter?: number; // Tempo para forçar refresh (ms)
  enabled?: boolean;
}

export const usePageTimeout = (options: PageTimeoutOptions = {}) => {
  const {
    maxLoadTime = 10000, // 10 segundos
    forceRefreshAfter = 15000, // 15 segundos
    enabled = true
  } = options;

  const router = useRouter();
  const { addToast } = useToast();
  const loadStartRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const forceTimeoutRef = useRef<NodeJS.Timeout>();
  const hasShownWarningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    // Reset no início de cada página
    loadStartRef.current = Date.now();
    hasShownWarningRef.current = false;

    // Timeout de aviso
    timeoutRef.current = setTimeout(() => {
      if (!hasShownWarningRef.current) {
        hasShownWarningRef.current = true;
        addToast('A página está demorando para carregar...', 'warning');
        console.warn('🐌 Página lenta detectada');
      }
    }, maxLoadTime);

    // Timeout de força bruta - desbloqueio definitivo
    forceTimeoutRef.current = setTimeout(() => {
      console.error('🚨 PÁGINA TRAVADA - DESBLOQUEANDO FORÇADAMENTE');
      
      // 1. Remover qualquer overlay de loading
      const overlays = document.querySelectorAll('[id*="loading"], [id*="overlay"], .loading-overlay');
      overlays.forEach(overlay => overlay.remove());
      
      // 2. Restaurar interatividade
      document.body.style.pointerEvents = 'auto';
      document.body.style.opacity = '1';
      document.body.style.cursor = 'default';
      
      // 3. Remover classes de loading
      document.body.classList.remove('loading', 'blocked');
      
      // 4. Forçar re-render se necessário
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
      loadingElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      
      // 5. Toast de desbloqueio
      addToast('Página desbloqueada automaticamente', 'info');
      
      // 6. Tentar refresh suave
      setTimeout(() => {
        try {
          router.refresh();
        } catch (e) {
          console.warn('Router refresh falhou, continuando...');
        }
      }, 1000);
      
    }, forceRefreshAfter);

    // Cleanup quando a página carrega
    const handleLoad = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (forceTimeoutRef.current) clearTimeout(forceTimeoutRef.current);
    };

    // Detectar quando a página termina de carregar
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      document.addEventListener('DOMContentLoaded', handleLoad);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (forceTimeoutRef.current) clearTimeout(forceTimeoutRef.current);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('DOMContentLoaded', handleLoad);
    };
  }, [enabled, maxLoadTime, forceRefreshAfter, addToast, router]);

  // Função para desbloquear manualmente
  const forceUnblock = () => {
    console.log('🔓 Desbloqueio manual acionado');
    
    // Remover todos os overlays
    const overlays = document.querySelectorAll('[id*="loading"], [id*="overlay"], .loading-overlay');
    overlays.forEach(overlay => overlay.remove());
    
    // Restaurar interatividade
    document.body.style.pointerEvents = 'auto';
    document.body.style.opacity = '1';
    document.body.style.cursor = 'default';
    
    // Limpar timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (forceTimeoutRef.current) clearTimeout(forceTimeoutRef.current);
    
    addToast('Página desbloqueada manualmente', 'success');
  };

  return { forceUnblock };
};
