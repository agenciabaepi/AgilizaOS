'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MenuLayout from '@/components/MenuLayout';
import AuthGuardFinal from '@/components/AuthGuardFinal';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import DashboardAparelhosRanking from '@/components/dashboard/DashboardAparelhosRanking';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath, canAccessRoute } from '@/lib/dashboardRouting';
import { cn } from '@/lib/utils';

function mesKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function capitalizePt(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildMesTabs(count = 12, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = mesKeyFromDate(d);
    const short =
      d.getFullYear() === now.getFullYear()
        ? format(d, 'MMM', { locale: ptBR })
        : format(d, "MMM ''yy", { locale: ptBR });
    return {
      key,
      label: capitalizePt(short),
      fullLabel: capitalizePt(format(d, "MMMM 'de' yyyy", { locale: ptBR })),
    };
  });
}

export default function DashboardPage() {
  const { usuarioData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const mesTabs = useMemo(() => buildMesTabs(12), []);
  const [mesKey, setMesKey] = useState(() => mesKeyFromDate(new Date()));

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!usuarioData) return;
    if (usuarioData.nivel && !canAccessRoute(usuarioData, '/dashboard')) {
      router.replace(getDashboardPath(usuarioData));
      return;
    }
    setPermissionChecked(true);
  }, [usuarioData, authLoading, router]);

  const mesLabel = mesTabs.find((t) => t.key === mesKey)?.fullLabel || mesKey;

  if (!isClient || authLoading || !permissionChecked) {
    return (
      <AuthGuardFinal>
        <MenuLayout>
          <div className="flex items-center justify-center min-h-screen bg-white dark:bg-zinc-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-zinc-100" />
          </div>
        </MenuLayout>
      </AuthGuardFinal>
    );
  }

  return (
    <AuthGuardFinal>
      <MenuLayout>
        <div className="px-2 md:px-0 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Dashboard
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Dados de {mesLabel}
              </p>
            </div>
          </div>
          <div
            role="tablist"
            aria-label="Mês da dashboard"
            className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin"
          >
            {mesTabs.map((tab) => {
              const active = tab.key === mesKey;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMesKey(tab.key)}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'bg-lime-600 text-white shadow-sm dark:bg-lime-500 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 md:mb-10">
          <DashboardOverview mesKey={mesKey} />
        </div>

        <div className="mb-6 md:mb-10">
          <DashboardAparelhosRanking mesKey={mesKey} />
        </div>
      </MenuLayout>
    </AuthGuardFinal>
  );
}
