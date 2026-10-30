import { getAuthUserIdFromRequest } from '@/lib/supabase/authFromRequest';
import { createAdminClient } from '@/lib/supabaseClient';
import { isUsuarioTecnico, TECNICOS_OR_FILTER } from '@/lib/tecnicos';

export type GclistTecnico = {
  authUserId: string;
  usuarioId: string;
  empresaId: string;
  nome: string;
  /** IDs que podem aparecer em ordens_servico.tecnico_id */
  tecnicoIds: string[];
};

/**
 * Resolve o técnico autenticado (Bearer ou cookie) para rotas do GCList.
 * Aceita nivel=tecnico ou admin/usuarioteste com tambem_tecnico.
 */
export async function resolveTecnicoFromRequest(
  request: Request
): Promise<{ tecnico: GclistTecnico } | { error: string; status: number }> {
  const authUserId = await getAuthUserIdFromRequest(request);
  if (!authUserId) {
    return { error: 'Não autorizado. Faça login.', status: 401 };
  }

  const supabase = createAdminClient();
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, nome, empresa_id, nivel, tambem_tecnico')
    .eq('auth_user_id', authUserId)
    .or(TECNICOS_OR_FILTER)
    .maybeSingle();

  if (error || !usuario || !isUsuarioTecnico(usuario) || !usuario.empresa_id) {
    return {
      error: 'Usuário não encontrado ou sem permissão de técnico.',
      status: 403,
    };
  }

  const tecnicoIds = Array.from(
    new Set([String(usuario.id), String(authUserId)].filter(Boolean))
  );

  return {
    tecnico: {
      authUserId,
      usuarioId: String(usuario.id),
      empresaId: String(usuario.empresa_id),
      nome: usuario.nome || '',
      tecnicoIds,
    },
  };
}

/** Filtro PostgREST: tecnico_id IN (...ids do técnico). */
export function tecnicoIdOrFilter(tecnicoIds: string[]): string {
  return tecnicoIds.map((id) => `tecnico_id.eq.${id}`).join(',');
}
