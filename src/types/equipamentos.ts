export type TipoEquipamentoOrigem = 'catalogo_global' | 'empresa';

/** Tipo de equipamento unificado (catálogo Consert + custom da empresa) */
export interface TipoEquipamento {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  origem: TipoEquipamentoOrigem;
  catalogoId: string | null;
  empresaTipoId: string | null;
  ativo?: boolean;
}

export interface TipoEquipamentoCatalogo {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Payload enviado pelos seletores para o formulário da OS */
export interface TipoEquipamentoSelecionado {
  codigo: string;
  nome: string;
  origem: TipoEquipamentoOrigem;
  catalogoId: string | null;
  empresaTipoId: string | null;
}

export function tipoEquipamentoLabel(t: Pick<TipoEquipamentoSelecionado, 'nome' | 'codigo'>): string {
  return t.nome?.trim() || t.codigo;
}
