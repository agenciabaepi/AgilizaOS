'use client';

import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import SimpleDashboard from '@/components/SimpleDashboard';
import DebugLoading from '@/components/DebugLoading';

export default function DashboardPage() {
  const { usuarioData } = useAuth();

  // Redirecionamento automático baseado no nível do usuário
  if (usuarioData?.nivel && usuarioData.nivel !== 'admin') {
    if (usuarioData.nivel === 'atendente') {
      window.location.href = '/dashboard-atendente';
      return null;
    } else if (usuarioData.nivel === 'tecnico') {
      window.location.href = '/dashboard-tecnico';
      return null;
    }
  }

  return (
    <MenuLayout>
      <ProtectedArea area="dashboard">
        <SimpleDashboard />
      </ProtectedArea>
      
      {/* Componente de Debug */}
      <DebugLoading />
    </MenuLayout>
  );
}