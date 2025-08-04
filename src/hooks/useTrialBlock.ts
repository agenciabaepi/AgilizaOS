'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSubscription } from './useSubscription';

export function useTrialBlock() {
  const router = useRouter();
  const pathname = usePathname();
  const { assinatura, isTrialExpired, loading } = useSubscription();
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
    '/periodo-teste',
    '/planos',
    '/',
    '/assets',
    '/teste-expirado'
  ];

  // Páginas que devem ser sempre permitidas para usuários com trial ativo
  const paginasPermitidasTrial = [
    '/teste-expirado'
  ];

  useEffect(() => {
    // Se ainda está carregando, não fazer nada
    if (loading) {
      console.log('Debug useTrialBlock: Ainda carregando...');
      return;
    }

    console.log('Debug useTrialBlock:', {
      pathname,
      assinaturaStatus: assinatura?.status,
      isTrialExpired: isTrialExpired(),
      dataTrialFim: assinatura?.data_trial_fim,
      loading
    });

    // Verificar se está em uma página que deve ser bloqueada
    const deveSerBloqueada = paginasBloqueadas.some(pagina => 
      pathname.startsWith(pagina)
    );

    // Verificar se está em uma página permitida
    const estaPermitida = paginasPermitidas.some(pagina => 
      pathname.startsWith(pagina)
    );

    console.log('Debug páginas:', {
      deveSerBloqueada,
      estaPermitida,
      pathname
    });

    // Se está em página permitida, não bloquear (verificar primeiro)
    if (estaPermitida) {
      console.log('PERMITINDO: Página permitida');
      setIsBlocked(false);
      return;
    }

    // Se está no trial e NÃO expirou, permitir acesso normal
    if (assinatura?.status === 'trial' && !isTrialExpired()) {
      console.log('PERMITINDO: Trial ativo - acesso normal');
      setIsBlocked(false);
      return;
    }

    // Se o teste expirou e está em página que deve ser bloqueada
    if (assinatura?.status === 'trial' && isTrialExpired() && deveSerBloqueada) {
      console.log('BLOQUEANDO: Trial expirado em página bloqueada');
      setIsBlocked(true);
      router.push('/teste-expirado');
      return;
    }

    // Se está no trial e está em página permitida para trial, não bloquear
    if (assinatura?.status === 'trial' && paginasPermitidasTrial.some(pagina => 
      pathname.startsWith(pagina)
    )) {
      console.log('PERMITINDO: Trial ativo em página permitida para trial');
      setIsBlocked(false);
      return;
    }

    console.log('PERMITINDO: Acesso normal');
    setIsBlocked(false);
  }, [assinatura, isTrialExpired, pathname, router, loading]);

  return { isBlocked };
} 