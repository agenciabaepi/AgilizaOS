import type { SupabaseClient } from '@supabase/supabase-js';

export function normalizeTipoCodigo(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

/** Resolve tipo_id + codigo para insert/update de aparelhos */
export async function resolveAparelhoTipo(
  admin: SupabaseClient,
  input: { tipo_id?: string | null; tipo?: string | null }
): Promise<{ tipo_id: string | null; tipo: string }> {
  const codigo = normalizeTipoCodigo(input.tipo || 'CELULAR');

  if (input.tipo_id) {
    const { data } = await admin
      .from('equipamentos_tipos_catalogo')
      .select('id, codigo')
      .eq('id', input.tipo_id)
      .eq('ativo', true)
      .maybeSingle();

    if (data) {
      return { tipo_id: data.id, tipo: data.codigo };
    }
  }

  const { data: byCodigo } = await admin
    .from('equipamentos_tipos_catalogo')
    .select('id, codigo')
    .eq('codigo', codigo)
    .eq('ativo', true)
    .maybeSingle();

  if (byCodigo) {
    return { tipo_id: byCodigo.id, tipo: byCodigo.codigo };
  }

  return { tipo_id: null, tipo: codigo };
}

/** Filtro OR: tipo_id exato OU coluna tipo (legado / custom) */
export function applyAparelhoTipoFilter<T extends { eq: (col: string, val: string) => T; or: (filter: string) => T }>(
  query: T,
  params: { tipo_id?: string | null; tipo?: string | null }
): T {
  const codigo = params.tipo ? normalizeTipoCodigo(params.tipo) : '';
  if (params.tipo_id) {
    if (codigo) {
      return query.or(`tipo_id.eq.${params.tipo_id},tipo.eq.${codigo}`);
    }
    return query.eq('tipo_id', params.tipo_id);
  }
  if (codigo) {
    return query.eq('tipo', codigo);
  }
  return query;
}
