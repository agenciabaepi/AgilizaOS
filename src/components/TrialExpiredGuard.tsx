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

  // Se está tentando acessar /teste-expirado com trial ativo, redirecionar IMEDIATAMENTE
  useEffect(() => {
    if (user && pathname.startsWith('/teste-expirado') && assinatura?.status === 'trial' && !isTrialExpired()) {
      router.replace('/planos');
    }
  }, [user, pathname, assinatura, isTrialExpired, router]);

  // Se não há usuário autenticado, permitir acesso
  if (!user) {
    return <>{children}</>;
  }

  if (pathname.startsWith('/teste-expirado') && assinatura?.status === 'trial' && !isTrialExpired()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Se está bloqueado, não renderizar nada
  if (isBlocked) {
    return null;
  }
  return <>{children}</>;
} 