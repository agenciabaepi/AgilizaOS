import { canAccessPath, TECNICO_DEFAULT_PERMISSIONS } from '@/lib/permissions';

export { TECNICO_DEFAULT_PERMISSIONS };

/** Verifica acesso a rota com base nas permissões (compatível com middleware legado). */
export function canTecnicoAccessPath(
  pathname: string,
  permissoes: string[] | null | undefined,
  nivel?: string
): boolean {
  return canAccessPath(pathname, permissoes, nivel ?? 'tecnico');
}

/** @deprecated Use PERMISSION_GROUPS em grantablePermissions.ts */
export const TECNICO_OPCOES_PERMISSOES: { permissao: string; label: string }[] = [];
