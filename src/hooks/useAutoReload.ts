'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function useAutoReload() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    // Se mudou de página e não é a primeira carga
    if (previousPathname.current && previousPathname.current !== pathname) {
      console.log('🔄 Auto-reload: Mudança de página detectada');
      
      // Pequeno delay para evitar reload muito rápido
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
    
    // Atualizar referência
    previousPathname.current = pathname;
  }, [pathname]);
}
