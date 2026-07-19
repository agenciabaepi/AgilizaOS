/**
 * Helpers para identificar quem atua como técnico.
 * Admin (ou usuarioteste) com `tambem_tecnico` usa o mesmo login para OS/comissões.
 */

export type UsuarioTecnicoLike = {
  nivel?: string | null;
  tambem_tecnico?: boolean | null;
};

/** Filtro PostgREST: técnicos puros OU admin/usuarioteste com flag. */
export const TECNICOS_OR_FILTER =
  'nivel.eq.tecnico,and(nivel.eq.admin,tambem_tecnico.eq.true),and(nivel.eq.usuarioteste,tambem_tecnico.eq.true)';

export function isUsuarioTecnico(u: UsuarioTecnicoLike | null | undefined): boolean {
  if (!u) return false;
  const nivel = (u.nivel || '').toLowerCase();
  if (nivel === 'tecnico') return true;
  if ((nivel === 'admin' || nivel === 'usuarioteste') && u.tambem_tecnico === true) {
    return true;
  }
  return false;
}

/** Define se o usuário deve ter `tecnico_id` preenchido (Auth UID). */
export function deveTerTecnicoId(
  nivel: string | null | undefined,
  tambemTecnico: boolean | null | undefined
): boolean {
  return isUsuarioTecnico({ nivel, tambem_tecnico: !!tambemTecnico });
}

export function filterUsuariosTecnicos<T extends UsuarioTecnicoLike>(usuarios: T[]): T[] {
  return usuarios.filter(isUsuarioTecnico);
}
