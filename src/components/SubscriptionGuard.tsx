import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/Button';
import { FiAlertTriangle, FiClock, FiUsers, FiBox, FiTruck } from 'react-icons/fi';

interface SubscriptionGuardProps {
  children: ReactNode;
  tipo?: 'usuarios' | 'produtos' | 'clientes' | 'fornecedores';
  recurso?: string;
}

export const SubscriptionGuard = ({ children, tipo, recurso }: SubscriptionGuardProps) => {
  // Sistema sem bloqueio de assinatura: sempre renderizar children
  return <>{children}</>;

  // Código de limites e recursos desativado
  
  return <>{children}</>;
}; 