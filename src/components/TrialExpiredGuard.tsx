'use client';

interface TrialExpiredGuardProps {
  children: React.ReactNode;
}

export default function TrialExpiredGuard({ children }: TrialExpiredGuardProps) {
  // ✅ ACESSO TOTALMENTE LIVRE: Sem verificações de trial ou bloqueios
  // Apenas proteção por empresa_id será mantida nos componentes individuais
  return <>{children}</>;
} 