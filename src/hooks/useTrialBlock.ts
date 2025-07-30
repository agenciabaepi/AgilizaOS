'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSubscription } from './useSubscription';

export function useTrialBlock() {
  const router = useRouter();
  const pathname = usePathname();
  const { assinatura, isTrialExpired } = useSubscription();
  const [isBlocked, setIsBlocked] = useState(false);

  // Páginas que devem ser bloqueadas quando teste expirar
  const paginasBloqueadas = [
    '/dashboard',
    '/caixa',
    '/clientes',
    '/fornecedores',
    '/equipamentos',
    '/ordens',
    '/bancada',
    '/financeiro',
    '/lembretes',
    '/perfil',
    '/configuracoes'
  ];

  // Páginas que NÃO devem ser bloqueadas
  const paginasPermitidas = [
    '/login',
    '/cadastro',
    '/teste-expirado',
    '/',
    '/assets'
  ];

  // Páginas que devem ser sempre permitidas para usuários com trial ativo
  const paginasPermitidasTrial = [
    '/teste-expirado'
  ];

  useEffect(() => {
    // Verificar se está em uma página que deve ser bloqueada
    const deveSerBloqueada = paginasBloqueadas.some(pagina => 
      pathname.startsWith(pagina)
    );

    // Verificar se está em uma página permitida
    const estaPermitida = paginasPermitidas.some(pagina => 
      pathname.startsWith(pagina)
    );

    // Se o teste expirou e está em página que deve ser bloqueada
    if (assinatura?.status === 'trial' && isTrialExpired() && deveSerBloqueada) {
      setIsBlocked(true);
      router.push('/teste-expirado');
      return;
    }

    // Se está em página permitida, não bloquear
    if (estaPermitida) {
      setIsBlocked(false);
      return;
    }

    // Se está no trial e está em página permitida para trial, não bloquear
    if (assinatura?.status === 'trial' && paginasPermitidasTrial.some(pagina => 
      pathname.startsWith(pagina)
    )) {
      setIsBlocked(false);
      return;
    }

    setIsBlocked(false);
  }, [assinatura, isTrialExpired, pathname, router]);

  return { isBlocked };
} 