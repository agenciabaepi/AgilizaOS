import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeTipoCodigo } from '@/lib/aparelhos-tipo';
import { mergeChecklistItens } from '@/lib/checklist-merge';
import type { ChecklistItemBase } from '@/types/checklist';

const CATALOGO_SELECT =
  'id, nome, descricao, categoria, ordem, obrigatorio, ativo, tipo_id, equipamento_categoria';

/** Busca itens do catálogo global; retorna [] se a tabela não existir ou der erro. */
export async function fetchChecklistCatalogoItens(
  admin: SupabaseClient,
  params: { equipamentoCategoria?: string | null; tipoId?: string | null }
): Promise<ChecklistItemBase[]> {
  const cat = params.equipamentoCategoria ? normalizeTipoCodigo(params.equipamentoCategoria) : '';
  const tipoId = params.tipoId?.trim() || '';

  if (!cat && !tipoId) return [];

  let query = admin
    .from('checklist_itens_catalogo')
    .select(CATALOGO_SELECT)
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (tipoId && cat) {
    query = query.or(`tipo_id.eq.${tipoId},equipamento_categoria.eq.${cat}`);
  } else if (tipoId) {
    query = query.eq('tipo_id', tipoId);
  } else if (cat) {
    query = query.eq('equipamento_categoria', cat);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[checklist] catálogo global:', error.message);
    return [];
  }
  return (data || []) as ChecklistItemBase[];
}

const EMPRESA_SELECT =
  'id, nome, descricao, categoria, ordem, obrigatorio, ativo, equipamento_categoria, empresa_id';

/**
 * Itens da empresa: por categoria do tipo + itens legados sem categoria
 * (checklist padrão antigo da migração, válido para qualquer tipo).
 */
export async function fetchChecklistEmpresaItens(
  admin: SupabaseClient,
  params: {
    empresaId: string;
    equipamentoCategoria?: string | null;
    ativo?: boolean | null;
    categoriaGrupo?: string | null;
  }
): Promise<ChecklistItemBase[]> {
  const { empresaId, equipamentoCategoria, ativo, categoriaGrupo } = params;

  let query = admin
    .from('checklist_itens')
    .select(EMPRESA_SELECT)
    .eq('empresa_id', empresaId)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (ativo === true) query = query.eq('ativo', true);
  if (ativo === false) query = query.eq('ativo', false);

  if (categoriaGrupo) query = query.eq('categoria', categoriaGrupo);

  const cat = equipamentoCategoria ? normalizeTipoCodigo(equipamentoCategoria) : '';
  if (cat) {
    query = query.or(`equipamento_categoria.eq.${cat},equipamento_categoria.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[checklist] empresa:', error.message);
    return [];
  }
  return (data || []) as ChecklistItemBase[];
}
