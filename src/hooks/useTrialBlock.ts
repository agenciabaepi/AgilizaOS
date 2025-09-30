'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSubscription } from './useSubscription';

export function useTrialBlock() {
  const pathname = usePathname();
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(false);
  const { assinatura, isTrialExpired, loading } = useSubscription();

  // Páginas que devem ser bloqueadas quando teste expirar
  const paginasBloqueadas: string[] = []; // bloqueio desativado

  // Páginas que NÃO devem ser bloqueadas
  const paginasPermitidas = ['/', '/login'];

  // Páginas que devem ser sempre permitidas para usuários com trial ativo
  const paginasPermitidasTrial = [
    '/teste-expirado'
  ];

  useEffect(() => {
    // Se ainda está carregando, não fazer nada
    if (loading) return;

    // logs suprimidos em dev/prod para evitar poluição

    // Verificar se está em uma página que deve ser bloqueada
    const deveSerBloqueada = paginasBloqueadas.some(pagina => 
      pathname.startsWith(pagina)
    );

    // Verificar se está em uma página permitida
    const estaPermitida = paginasPermitidas.some(pagina => 
      pathname.startsWith(pagina)
    );

    // logs suprimidos

    // Se está em página permitida, não bloquear (verificar primeiro)
    if (estaPermitida) {
      setIsBlocked(false);
      return;
    }

    // Se está no trial e NÃO expirou, permitir acesso normal
    if (assinatura?.status === 'trial' && !isTrialExpired()) {
      setIsBlocked(false);
      return;
    }

    // Se o teste expirou e está em página que deve ser bloqueada
    // bloqueio desativado

    // Se está no trial e está em página permitida para trial, não bloquear
    if (assinatura?.status === 'trial' && paginasPermitidasTrial.some(pagina => 
      pathname.startsWith(pagina)
    )) {
      setIsBlocked(false);
      return;
    }

    setIsBlocked(false);
  }, [assinatura, isTrialExpired, pathname, router, loading]);

  return { isBlocked };
} 