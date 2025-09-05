'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/Toast';

interface UseOSLoadingOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelayMs?: number;
}

interface UseOSLoadingReturn {
  loading: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: Error | null) => void;
  retry: () => Promise<void>;
  executeWithLoading: <T>(
    operation: () => Promise<T>,
    options?: { skipTimeout?: boolean }
  ) => Promise<T | null>;
}

/**
 * Hook especializado para gerenciar loading states nas páginas críticas de OS
 * Inclui timeout automático, retry logic e tratamento de erros robusto
 */
export const useOSLoading = (options: UseOSLoadingOptions = {}): UseOSLoadingReturn => {
  const {
    timeoutMs = 15000, // 15 segundos por padrão
    onTimeout,
    onError,
    retryAttempts = 3,
    retryDelayMs = 1000
  } = options;

  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);

  // Limpar timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const clearLoadingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLoadingTimeout = useCallback(() => {
    clearLoadingTimeout();
    
    timeoutRef.current = setTimeout(() => {
      console.warn('🚨 Loading timeout atingido após', timeoutMs, 'ms');
      
      const timeoutError = new Error(`Operação demorou mais que ${timeoutMs / 1000} segundos para completar`);
      setError(timeoutError);
      setLoading(false);
      
      addToast('error', 'A operação está demorando mais que o esperado. Tente novamente.');
      
      if (onTimeout) {
        onTimeout();
      }
      
      if (onError) {
        onError(timeoutError);
      }
    }, timeoutMs);
  }, [timeoutMs, onTimeout, onError, addToast, clearLoadingTimeout]);

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
    startLoadingTimeout();
  }, [startLoadingTimeout]);

  const stopLoading = useCallback(() => {
    setLoading(false);
    clearLoadingTimeout();
  }, [clearLoadingTimeout]);

  const handleSetError = useCallback((error: Error | null) => {
    setError(error);
    if (error) {
      stopLoading();
      console.error('🚨 Erro capturado pelo useOSLoading:', error);
      
      if (onError) {
        onError(error);
      }
    }
  }, [stopLoading, onError]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const retry = useCallback(async () => {
    if (retryCount >= retryAttempts) {
      console.warn('Máximo de tentativas atingido:', retryAttempts);
      addToast('error', `Falha após ${retryAttempts} tentativas. Verifique sua conexão.`);
      return;
    }

    if (!lastOperationRef.current) {
      console.warn('Nenhuma operação para retry');
      return;
    }

    console.log(`Tentativa ${retryCount + 1}/${retryAttempts}`);
    
    setIsRetrying(true);
    setError(null);
    
    // Delay progressivo: 1s, 2s, 3s...
    const delayTime = retryDelayMs * (retryCount + 1);
    await delay(delayTime);
    
    try {
      setRetryCount(prev => prev + 1);
      await lastOperationRef.current();
      
      // Reset retry count em caso de sucesso
      setRetryCount(0);
      addToast('success', 'Operação realizada com sucesso!');
    } catch (error) {
      console.error('Erro no retry:', error);
      handleSetError(error as Error);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, retryAttempts, retryDelayMs, addToast, handleSetError]);

  const executeWithLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    options: { skipTimeout?: boolean } = {}
  ): Promise<T | null> => {
    try {
      // Armazenar operação para retry
      lastOperationRef.current = operation;
      
      // Iniciar loading (com ou sem timeout)
      setLoading(true);
      setError(null);
      
      if (!options.skipTimeout) {
        startLoadingTimeout();
      }

      console.log('🔄 Iniciando operação com loading...');
      const result = await operation();
      
      console.log('✅ Operação completada com sucesso');
      stopLoading();
      
      // Reset retry count em caso de sucesso
      setRetryCount(0);
      
      return result;
    } catch (error) {
      console.error('❌ Erro na operação:', error);
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      handleSetError(errorObj);
      
      // Mostrar toast de erro específico
      if (errorObj.message.includes('timeout')) {
        addToast('error', 'Operação demorou muito para responder. Tente novamente.');
      } else if (errorObj.message.includes('network')) {
        addToast('error', 'Erro de conexão. Verifique sua internet.');
      } else {
        addToast('error', 'Erro inesperado. Tente novamente.');
      }
      
      return null;
    }
  }, [startLoadingTimeout, stopLoading, handleSetError, addToast]);

  return {
    loading,
    error,
    retryCount,
    isRetrying,
    startLoading,
    stopLoading,
    setError: handleSetError,
    retry,
    executeWithLoading
  };
};

/**
 * Hook específico para operações de OS com configurações otimizadas
 */
export const useOSOperation = () => {
  return useOSLoading({
    timeoutMs: 20000, // 20s para operações de OS (mais complexas)
    retryAttempts: 3,
    retryDelayMs: 2000
  });
};

/**
 * Hook específico para queries rápidas (listas, filtros, etc.)
 */
export const useOSQuery = () => {
  return useOSLoading({
    timeoutMs: 10000, // 10s para queries simples
    retryAttempts: 2,
    retryDelayMs: 1000
  });
};

export default useOSLoading;


import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/Toast';

interface UseOSLoadingOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelayMs?: number;
}

interface UseOSLoadingReturn {
  loading: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: Error | null) => void;
  retry: () => Promise<void>;
  executeWithLoading: <T>(
    operation: () => Promise<T>,
    options?: { skipTimeout?: boolean }
  ) => Promise<T | null>;
}

/**
 * Hook especializado para gerenciar loading states nas páginas críticas de OS
 * Inclui timeout automático, retry logic e tratamento de erros robusto
 */
export const useOSLoading = (options: UseOSLoadingOptions = {}): UseOSLoadingReturn => {
  const {
    timeoutMs = 15000, // 15 segundos por padrão
    onTimeout,
    onError,
    retryAttempts = 3,
    retryDelayMs = 1000
  } = options;

  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);

  // Limpar timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const clearLoadingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLoadingTimeout = useCallback(() => {
    clearLoadingTimeout();
    
    timeoutRef.current = setTimeout(() => {
      console.warn('🚨 Loading timeout atingido após', timeoutMs, 'ms');
      
      const timeoutError = new Error(`Operação demorou mais que ${timeoutMs / 1000} segundos para completar`);
      setError(timeoutError);
      setLoading(false);
      
      addToast('error', 'A operação está demorando mais que o esperado. Tente novamente.');
      
      if (onTimeout) {
        onTimeout();
      }
      
      if (onError) {
        onError(timeoutError);
      }
    }, timeoutMs);
  }, [timeoutMs, onTimeout, onError, addToast, clearLoadingTimeout]);

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
    startLoadingTimeout();
  }, [startLoadingTimeout]);

  const stopLoading = useCallback(() => {
    setLoading(false);
    clearLoadingTimeout();
  }, [clearLoadingTimeout]);

  const handleSetError = useCallback((error: Error | null) => {
    setError(error);
    if (error) {
      stopLoading();
      console.error('🚨 Erro capturado pelo useOSLoading:', error);
      
      if (onError) {
        onError(error);
      }
    }
  }, [stopLoading, onError]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const retry = useCallback(async () => {
    if (retryCount >= retryAttempts) {
      console.warn('Máximo de tentativas atingido:', retryAttempts);
      addToast('error', `Falha após ${retryAttempts} tentativas. Verifique sua conexão.`);
      return;
    }

    if (!lastOperationRef.current) {
      console.warn('Nenhuma operação para retry');
      return;
    }

    console.log(`Tentativa ${retryCount + 1}/${retryAttempts}`);
    
    setIsRetrying(true);
    setError(null);
    
    // Delay progressivo: 1s, 2s, 3s...
    const delayTime = retryDelayMs * (retryCount + 1);
    await delay(delayTime);
    
    try {
      setRetryCount(prev => prev + 1);
      await lastOperationRef.current();
      
      // Reset retry count em caso de sucesso
      setRetryCount(0);
      addToast('success', 'Operação realizada com sucesso!');
    } catch (error) {
      console.error('Erro no retry:', error);
      handleSetError(error as Error);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, retryAttempts, retryDelayMs, addToast, handleSetError]);

  const executeWithLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    options: { skipTimeout?: boolean } = {}
  ): Promise<T | null> => {
    try {
      // Armazenar operação para retry
      lastOperationRef.current = operation;
      
      // Iniciar loading (com ou sem timeout)
      setLoading(true);
      setError(null);
      
      if (!options.skipTimeout) {
        startLoadingTimeout();
      }

      console.log('🔄 Iniciando operação com loading...');
      const result = await operation();
      
      console.log('✅ Operação completada com sucesso');
      stopLoading();
      
      // Reset retry count em caso de sucesso
      setRetryCount(0);
      
      return result;
    } catch (error) {
      console.error('❌ Erro na operação:', error);
      
      const errorObj = error instanceof Error ? error : new Error(String(error));
      handleSetError(errorObj);
      
      // Mostrar toast de erro específico
      if (errorObj.message.includes('timeout')) {
        addToast('error', 'Operação demorou muito para responder. Tente novamente.');
      } else if (errorObj.message.includes('network')) {
        addToast('error', 'Erro de conexão. Verifique sua internet.');
      } else {
        addToast('error', 'Erro inesperado. Tente novamente.');
      }
      
      return null;
    }
  }, [startLoadingTimeout, stopLoading, handleSetError, addToast]);

  return {
    loading,
    error,
    retryCount,
    isRetrying,
    startLoading,
    stopLoading,
    setError: handleSetError,
    retry,
    executeWithLoading
  };
};

/**
 * Hook específico para operações de OS com configurações otimizadas
 */
export const useOSOperation = () => {
  return useOSLoading({
    timeoutMs: 20000, // 20s para operações de OS (mais complexas)
    retryAttempts: 3,
    retryDelayMs: 2000
  });
};

/**
 * Hook específico para queries rápidas (listas, filtros, etc.)
 */
export const useOSQuery = () => {
  return useOSLoading({
    timeoutMs: 10000, // 10s para queries simples
    retryAttempts: 2,
    retryDelayMs: 1000
  });
};

export default useOSLoading;
