import type { SupabaseClient } from '@supabase/supabase-js';
import type { TipoEquipamento } from '@/types/equipamentos';
import { normalizeTipoCodigo } from '@/lib/aparelhos-tipo';

interface CatalogoRow {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  ativo: boolean;
}

interface EmpresaRow {
  id: string;
  nome: string;
  categoria: string;
  descricao?: string | null;
  codigo?: string | null;
  catalogo_id?: string | null;
  ativo: boolean;
}

/** Lista unificada: catálogo global + tipos customizados da empresa (sem duplicar catálogo) */
export async function listTiposEquipamentoUnificados(
  admin: SupabaseClient,
  empresaId: string
): Promise<TipoEquipamento[]> {
  const [catalogoRes, empresaRes] = await Promise.all([
    admin
      .from('equipamentos_tipos_catalogo')
      .select('id, codigo, nome, descricao, ordem, ativo')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true }),
    admin
      .from('equipamentos_tipos')
      .select('id, nome, categoria, descricao, codigo, catalogo_id, ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome', { ascending: true }),
  ]);

  if (empresaRes.error) throw empresaRes.error;

  const catalogoIds = new Set<string>();
  const tipos: TipoEquipamento[] = [];

  const catalogoRows = catalogoRes.error ? [] : ((catalogoRes.data || []) as CatalogoRow[]);

  for (const row of catalogoRows) {
    catalogoIds.add(row.id);
    tipos.push({
      id: row.id,
      codigo: row.codigo,
      nome: row.nome,
      descricao: row.descricao,
      origem: 'catalogo_global',
      catalogoId: row.id,
      empresaTipoId: null,
      ativo: row.ativo,
    });
  }

  for (const row of (empresaRes.data || []) as EmpresaRow[]) {
    if (row.catalogo_id && catalogoIds.has(row.catalogo_id)) continue;

    const codigo = normalizeTipoCodigo(row.codigo || row.nome || row.categoria);
    if (tipos.some((t) => t.codigo === codigo)) continue;

    tipos.push({
      id: row.id,
      codigo,
      nome: row.nome || codigo,
      descricao: row.descricao,
      origem: 'empresa',
      catalogoId: row.catalogo_id || null,
      empresaTipoId: row.id,
      ativo: row.ativo,
    });
  }

  return tipos;
}

export function toTipoEquipamentoSelecionado(t: TipoEquipamento) {
  return {
    codigo: t.codigo,
    nome: t.nome,
    origem: t.origem,
    catalogoId: t.catalogoId,
    empresaTipoId: t.empresaTipoId,
  };
}
