'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import EmergencyDashboard from '@/components/EmergencyDashboard';

export default function DashboardPage() {
  const { usuarioData } = useAuth();
  const router = useRouter();

  // Redirecionamento automático baseado no nível do usuário
  useEffect(() => {
    if (usuarioData?.nivel && usuarioData.nivel !== 'admin' && usuarioData.nivel !== 'usuarioteste') {
      if (usuarioData.nivel === 'atendente') {
        window.location.href = '/dashboard-atendente';
      } else if (usuarioData.nivel === 'tecnico') {
        window.location.href = '/dashboard-tecnico';
      }
    }
  }, [usuarioData?.nivel, router]);

  return (
    <MenuLayout>
      <ProtectedArea area="dashboard">
        <EmergencyDashboard />
      </ProtectedArea>
    </MenuLayout>
  );
}