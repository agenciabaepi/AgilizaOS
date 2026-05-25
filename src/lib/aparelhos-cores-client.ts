import type { SupabaseClient } from '@supabase/supabase-js';
import type { AparelhoCatalogoCor } from '@/types/cores';

type CorRowDb = {
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

function mapRow(row: CorRowDb): AparelhoCatalogoCor {
  const ref = Array.isArray(row.cores_catalogo) ? row.cores_catalogo[0] : row.cores_catalogo;
  return {
    id: row.id,
    aparelho_catalogo_id: row.aparelho_catalogo_id,
    cor_id: row.cor_id,
    cor_nome: ref?.nome,
    cor_hex: ref?.hex ?? null,
    imagem_url: row.imagem_url,
    imagem_frente_url: row.imagem_frente_url,
    imagem_verso_url: row.imagem_verso_url,
    ordem: row.ordem,
    ativo: row.ativo,
  };
}

/** Busca variantes de cor no Supabase (cliente autenticado, RLS) */
export async function fetchCoresAparelhoCliente(
  supabase: SupabaseClient,
  aparelhoCatalogoId: string
): Promise<AparelhoCatalogoCor[]> {
  const selectComJoin = `
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

  let { data, error } = await supabase
    .from('aparelhos_catalogo_cores')
    .select(selectComJoin)
    .eq('aparelho_catalogo_id', aparelhoCatalogoId)
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error) {
    const fallback = await supabase
      .from('aparelhos_catalogo_cores')
      .select('id, aparelho_catalogo_id, cor_id, imagem_url, imagem_frente_url, imagem_verso_url, ordem, ativo')
      .eq('aparelho_catalogo_id', aparelhoCatalogoId)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    data = fallback.data as CorRowDb[] | null;
    if (fallback.error || !data?.length) {
      console.warn('[aparelhos-cores] fetch falhou:', error.message, fallback.error?.message);
      return [];
    }

    const corIds = [...new Set(data.map((r) => r.cor_id))];
    const { data: refs } = await supabase.from('cores_catalogo').select('id, nome, hex').in('id', corIds);
    const mapa = new Map((refs || []).map((c) => [c.id, c]));
    return data.map((row) => {
      const ref = mapa.get(row.cor_id);
      return mapRow({
        ...row,
        cores_catalogo: ref ? { nome: ref.nome, hex: ref.hex } : null,
      });
    });
  }

  return ((data || []) as CorRowDb[]).map(mapRow);
}
