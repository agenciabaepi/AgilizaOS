'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canUseModule, hasFullAccess } from '@/lib/permissions';

export function usePermissions() {
  const { usuarioData } = useAuth();

  const nivel = usuarioData?.nivel;
  const rawPermissoes = usuarioData?.permissoes;
  const isAdmin = hasFullAccess(nivel);

  const podeVer = useMemo(
    () => (key: string) => canUseModule(key, nivel, rawPermissoes),
    [nivel, rawPermissoes]
  );

  return {
    permissoes: rawPermissoes ?? [],
    nivel,
    isAdmin,
    podeVer,
  };
}
