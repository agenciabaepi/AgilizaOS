'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import LaudoProntoAlert from '@/components/LaudoProntoAlert';
import DashboardAtendenteOverview from '@/components/dashboard/DashboardAtendenteOverview';
import { getDashboardPath, canAccessRoute } from '@/lib/dashboardRouting';

export default function DashboardAtendentePage() {
  const router = useRouter();
  const { usuarioData, loading: authLoading } = useAuth();
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!usuarioData) return;

    if (usuarioData.nivel && !canAccessRoute(usuarioData, '/dashboard-atendente')) {
      router.replace(getDashboardPath(usuarioData));
      return;
    }

    setPermissionChecked(true);
  }, [authLoading, usuarioData, router]);

  if (authLoading || !permissionChecked) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-zinc-100" />
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="space-y-4 md:space-y-6 px-2 md:px-0 pb-8">
        <LaudoProntoAlert />
        <DashboardAtendenteOverview />
      </div>
    </MenuLayout>
  );
}
