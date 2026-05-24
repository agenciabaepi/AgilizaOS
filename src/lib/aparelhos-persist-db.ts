import type { SupabaseClient } from '@supabase/supabase-js';
import { aparelhoImagensApplyToUpdate, aparelhoImagensInsertPayload } from '@/lib/aparelhos-imagens';

function isMissingImageColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === 'PGRST204' ||
    msg.includes('imagem_frente_url') ||
    msg.includes('imagem_verso_url') ||
    (msg.includes('column') && msg.includes('imagem_'))
  );
}

export function primaryImagemUrl(
  frente: string | null | undefined,
  verso: string | null | undefined
): string | null {
  const f = frente?.trim() || null;
  const v = verso?.trim() || null;
  return f || v;
}

/** Insert com fallback para banco que ainda só tem imagem_url */
export async function insertAparelhoCatalogo(
  supabase: SupabaseClient,
  row: Record<string, unknown>
) {
  const imagens = aparelhoImagensInsertPayload(row as Parameters<typeof aparelhoImagensInsertPayload>[0]);
  const fullRow = { ...row, ...imagens };

  let result = await supabase.from('aparelhos_catalogo').insert(fullRow).select().single();

  if (isMissingImageColumnError(result.error)) {
    const { imagem_frente_url, imagem_verso_url, ...base } = fullRow;
    void imagem_frente_url;
    void imagem_verso_url;
    result = await supabase
      .from('aparelhos_catalogo')
      .insert({
        ...base,
        imagem_url: imagens.imagem_url,
      })
      .select()
      .single();
  }

  return result;
}

/** Update com fallback para banco que ainda só tem imagem_url */
export async function updateAparelhoCatalogo(
  supabase: SupabaseClient,
  id: string,
  updateData: Record<string, unknown>
) {
  let result = await supabase
    .from('aparelhos_catalogo')
    .update(updateData)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (isMissingImageColumnError(result.error)) {
    const legacy: Record<string, unknown> = { updated_at: updateData.updated_at };
    for (const key of ['marca', 'modelo', 'tipo', 'tipo_id', 'ativo'] as const) {
      if (updateData[key] !== undefined) legacy[key] = updateData[key];
    }
    const frente = updateData.imagem_frente_url as string | null | undefined;
    const verso = updateData.imagem_verso_url as string | null | undefined;
    if (frente !== undefined || verso !== undefined) {
      legacy.imagem_url = primaryImagemUrl(
        frente as string | null,
        verso as string | null
      );
    } else if (updateData.imagem_url !== undefined) {
      legacy.imagem_url = updateData.imagem_url;
    }

    result = await supabase
      .from('aparelhos_catalogo')
      .update(legacy)
      .eq('id', id)
      .select()
      .maybeSingle();
  }

  return result;
}

export function buildAparelhoImagensUpdate(body: {
  imagem_url?: string | null;
  imagem_frente_url?: string | null;
  imagem_verso_url?: string | null;
}): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  aparelhoImagensApplyToUpdate(body, updateData);
  const frente = updateData.imagem_frente_url as string | null | undefined;
  const verso = updateData.imagem_verso_url as string | null | undefined;
  if (frente !== undefined || verso !== undefined) {
    updateData.imagem_url = primaryImagemUrl(
      frente as string | null,
      verso as string | null
    );
  }
  return updateData;
}
