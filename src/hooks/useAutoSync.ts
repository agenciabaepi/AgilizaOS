import { useEffect, useRef } from 'react';

interface UseAutoSyncOptions {
  intervalMs?: number; // Intervalo em milissegundos (padrão: 5 minutos)
  enabled?: boolean; // Se a sincronização automática está habilitada
}

export function useAutoSync(options: UseAutoSyncOptions = {}) {
  const { intervalMs = 5 * 60 * 1000, enabled = true } = options; // 5 minutos por padrão
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const syncContadores = async () => {
    try {
      console.log('🔄 Sincronização automática iniciada...');
      
      const response = await fetch('/api/sincronizar-contadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Sincronização automática concluída: ${result.contadoresAtualizados} contadores atualizados`);
      } else {
        console.error('❌ Erro na sincronização automática:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro na sincronização automática:', error);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Executar sincronização imediatamente
    syncContadores();

    // Configurar intervalo para sincronização automática
    intervalRef.current = setInterval(syncContadores, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs]);

  return {
    syncContadores,
    isEnabled: enabled
  };
}
