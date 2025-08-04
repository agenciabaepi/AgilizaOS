'use client';

import { useEffect } from 'react';
import { useTrialBlock } from '@/hooks/useTrialBlock';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

interface TrialExpiredGuardProps {
  children: React.ReactNode;
}

export default function TrialExpiredGuard({ children }: TrialExpiredGuardProps) {
  const { isBlocked } = useTrialBlock();
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();
  const { assinatura, isTrialExpired } = useSubscription();

  // Se não há usuário autenticado, permitir acesso
  if (!user) {
    return <>{children}</>;
  }

  // Se está no trial e NÃO expirou, permitir acesso normal (não redirecionar)
  if (assinatura?.status === 'trial' && !isTrialExpired()) {
    console.log('TrialExpiredGuard: Trial ativo, permitindo acesso normal');
    return <>{children}</>;
  }

  // Se está bloqueado, não renderizar nada
  if (isBlocked) {
    return null;
  }
  return <>{children}</>;
} 