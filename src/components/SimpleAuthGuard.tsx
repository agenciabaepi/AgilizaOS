'use client';

interface SimpleAuthGuardProps {
  children: React.ReactNode;
}

export default function SimpleAuthGuard({ children }: SimpleAuthGuardProps) {
  // ✅ ACESSO TOTALMENTE LIVRE: Sem verificações de autenticação
  // Apenas proteção por empresa_id será mantida nos componentes individuais
  return <>{children}</>;
}
