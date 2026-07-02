import type { SupabaseClient } from '@supabase/supabase-js';
import { listTiposEquipamentoUnificados } from '@/lib/equipamentos-tipos-merge';
import { fetchChecklistCatalogoItens, fetchChecklistEmpresaItens } from '@/lib/checklist-server';
import { mergeChecklistItens } from '@/lib/checklist-merge';

export interface CategoriaEquipamentoResumo {
  categoria: string;
  nome: string;
  tipo_id: string | null;
  origem: 'catalogo_global' | 'empresa';
  total_equipamentos: number;
  total_checklist: number;
}

/** Categorias para tela de checklist: tipos do catálogo Consert + customizados da empresa. */
export async function listCategoriasEquipamentoComChecklist(
  admin: SupabaseClient,
  empresaId: string
): Promise<CategoriaEquipamentoResumo[]> {
  const tipos = await listTiposEquipamentoUnificados(admin, empresaId);

  const { data: empresaRows } = await admin
    .from('equipamentos_tipos')
    .select('id, catalogo_id, categoria, nome')
    .eq('empresa_id', empresaId)
    .eq('ativo', true);

  const countByCodigo = new Map<string, number>();
  for (const row of empresaRows || []) {
    const codigo = String(row.categoria || row.nome || '')
      .trim()
      .toUpperCase();
    if (!codigo) continue;
    countByCodigo.set(codigo, (countByCodigo.get(codigo) || 0) + 1);
  }

  const result: CategoriaEquipamentoResumo[] = [];

  for (const tipo of tipos) {
    const codigo = tipo.codigo;
    const [catalogoItens, empresaItens] = await Promise.all([
      fetchChecklistCatalogoItens(admin, {
        equipamentoCategoria: codigo,
        tipoId: tipo.catalogoId,
      }),
      fetchChecklistEmpresaItens(admin, {
        empresaId,
        equipamentoCategoria: codigo,
        ativo: true,
      }),
    ]);
    const merged = mergeChecklistItens(catalogoItens, empresaItens);
    const empresaCount = countByCodigo.get(codigo) || 0;

    result.push({
      categoria: codigo,
      nome: tipo.nome,
      tipo_id: tipo.catalogoId || tipo.id,
      origem: tipo.origem,
      total_equipamentos: tipo.origem === 'empresa' && empresaCount > 0 ? empresaCount : 1,
      total_checklist: merged.length,
    });
  }

  return result;
}
