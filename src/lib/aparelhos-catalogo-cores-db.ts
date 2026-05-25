import type { SupabaseClient } from '@supabase/supabase-js';
import type { AparelhoCatalogoCor } from '@/types/cores';
import { aparelhoImagensInsertPayload } from '@/lib/aparelhos-imagens';

type CorRow = {
  id: string;
  aparelho_catalogo_id: string;
  cor_id: string;
  imagem_url: string | null;
  imagem_frente_url: string | null;
  imagem_verso_url: string | null;
  ordem: number;
  ativo: boolean;
  cores_catalogo?: { nome: string; hex: string | null } | { nome: string; hex: string | null }[] | null;
};

function mapCorRow(row: CorRow): AparelhoCatalogoCor {
  const corRef = Array.isArray(row.cores_catalogo) ? row.cores_catalogo[0] : row.cores_catalogo;
  return {
    id: row.id,
    aparelho_catalogo_id: row.aparelho_catalogo_id,
    cor_id: row.cor_id,
    cor_nome: corRef?.nome,
    cor_hex: corRef?.hex ?? null,
    imagem_url: row.imagem_url,
    imagem_frente_url: row.imagem_frente_url,
    imagem_verso_url: row.imagem_verso_url,
    ordem: row.ordem,
    ativo: row.ativo,
  };
}

const COR_SELECT = `
  id,
  aparelho_catalogo_id,
  cor_id,
  imagem_url,
  imagem_frente_url,
  imagem_verso_url,
  ordem,
  ativo,
  cores_catalogo ( nome, hex )
`;

export async function fetchCoresPorAparelhosCatalogo(
  supabase: SupabaseClient,
  aparelhoIds: string[]
): Promise<Map<string, AparelhoCatalogoCor[]>> {
  const map = new Map<string, AparelhoCatalogoCor[]>();
  if (!aparelhoIds.length) return map;

  let { data, error } = await supabase
    .from('aparelhos_catalogo_cores')
    .select(COR_SELECT)
    .in('aparelho_catalogo_id', aparelhoIds)
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error) {
    const fallback = await supabase
      .from('aparelhos_catalogo_cores')
      .select('id, aparelho_catalogo_id, cor_id, imagem_url, imagem_frente_url, imagem_verso_url, ordem, ativo')
      .in('aparelho_catalogo_id', aparelhoIds)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) return map;

  const corIds = [...new Set((data as CorRow[]).map((r) => r.cor_id))];
  const nomesCor = new Map<string, { nome: string; hex: string | null }>();
  if (corIds.length) {
    const { data: coresRef } = await supabase
      .from('cores_catalogo')
      .select('id, nome, hex')
      .in('id', corIds);
    for (const c of coresRef || []) {
      nomesCor.set(c.id, { nome: c.nome, hex: c.hex });
    }
  }

  for (const row of data as CorRow[]) {
    const id = row.aparelho_catalogo_id;
    const list = map.get(id) || [];
    const ref = nomesCor.get(row.cor_id);
    if (ref && !row.cores_catalogo) {
      row.cores_catalogo = ref;
    }
    list.push(mapCorRow(row));
    map.set(id, list);
  }

  return map;
}

export async function fetchCoresPorAparelhoCatalogo(
  supabase: SupabaseClient,
  aparelhoCatalogoId: string
): Promise<AparelhoCatalogoCor[]> {
  const map = await fetchCoresPorAparelhosCatalogo(supabase, [aparelhoCatalogoId]);
  return map.get(aparelhoCatalogoId) || [];
}

export async function syncAparelhoCatalogoCores(
  supabase: SupabaseClient,
  aparelhoCatalogoId: string,
  variantes: Array<{
    cor_id: string;
    imagem_frente_url?: string | null;
    imagem_verso_url?: string | null;
    imagem_url?: string | null;
    ordem?: number;
  }>
): Promise<{ error: { message: string } | null }> {
  const { error: delError } = await supabase
    .from('aparelhos_catalogo_cores')
    .delete()
    .eq('aparelho_catalogo_id', aparelhoCatalogoId);

  if (delError) return { error: delError };

  if (!variantes.length) return { error: null };

  const rows = variantes.map((v, idx) => {
    const imgs = aparelhoImagensInsertPayload({
      imagem_url: v.imagem_url,
      imagem_frente_url: v.imagem_frente_url,
      imagem_verso_url: v.imagem_verso_url,
    });
    return {
      aparelho_catalogo_id: aparelhoCatalogoId,
      cor_id: v.cor_id,
      ordem: v.ordem ?? idx,
      ativo: true,
      ...imgs,
    };
  });

  const { error: insError } = await supabase.from('aparelhos_catalogo_cores').insert(rows);
  return { error: insError };
}
