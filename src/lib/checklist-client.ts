import type { Session } from '@supabase/supabase-js';
import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';
import { normalizeTipoCodigo } from '@/lib/aparelhos-tipo';
import type { ChecklistItemUnificado } from '@/lib/checklist-merge';

export interface FetchChecklistItensParams {
  empresaId: string;
  session: Session | null;
  equipamentoCategoria?: string;
  tipoCatalogoId?: string | null;
}

/**
 * Carrega checklist (catálogo Consert + itens da empresa) via /api/checklist-itens,
 * que faz o merge no servidor.
 */
export async function fetchChecklistItensMerged(
  params: FetchChecklistItensParams
): Promise<ChecklistItemUnificado[]> {
  const { empresaId, session, equipamentoCategoria, tipoCatalogoId } = params;
  const cat = normalizeTipoCodigo(equipamentoCategoria);

  const urlParams = new URLSearchParams({ empresa_id: empresaId, ativo: 'true' });
  if (cat) urlParams.set('equipamento_categoria', cat);
  if (tipoCatalogoId) urlParams.set('tipo_id', tipoCatalogoId);

  const headers = await bearerAuthHeadersForApi(session, {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Content-Type': 'application/json',
  });

  const response = await fetch(`/api/checklist-itens?${urlParams}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Erro ao carregar checklist');
  }

  const data = await response.json();
  return data.itens || [];
}
