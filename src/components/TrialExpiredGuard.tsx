'use client';

import { useTrialBlock } from '@/hooks/useTrialBlock';
import { usePathname } from 'next/navigation';

interface TrialExpiredGuardProps {
  children: React.ReactNode;
}

export default function TrialExpiredGuard({ children }: TrialExpiredGuardProps) {
  const { isBlocked } = useTrialBlock();
  const pathname = usePathname();

  // Se está na página de teste expirado, sempre permitir
  if (pathname.startsWith('/teste-expirado')) {
    return <>{children}</>;
  }

  // Se está bloqueado, não renderizar nada
  if (isBlocked) {
    return null;
  }

  return <>{children}</>;
} 