'use client';

import { usePathname } from 'next/navigation';
import SubscriptionVencidaGuard from '@/components/SubscriptionVencidaGuard';

interface TrialExpiredGuardProps {
  children: React.ReactNode;
}

/**
 * Guard legado — delega para SubscriptionVencidaGuard (trial vencido + assinatura expirada).
 */
export default function TrialExpiredGuard({ children }: TrialExpiredGuardProps) {
  const pathname = usePathname();
  void pathname;
  return <SubscriptionVencidaGuard>{children}</SubscriptionVencidaGuard>;
}
