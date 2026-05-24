export type AparelhoOrigem = 'catalogo_global' | 'empresa' | 'manual';

export interface AparelhoCatalogo {
  id: string;
  tipo: string;
  tipo_id?: string | null;
  marca: string;
  modelo: string;
  /** Legado — preferir imagem_frente_url */
  imagem_url?: string | null;
  imagem_frente_url?: string | null;
  imagem_verso_url?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AparelhoEmpresa extends AparelhoCatalogo {
  empresa_id: string;
}

export interface AparelhoSelecionado {
  origem: AparelhoOrigem;
  catalogoId?: string | null;
  aparelhoEmpresaId?: string | null;
  tipo: string;
  tipoId?: string | null;
  marca: string;
  modelo: string;
  /** Frente ou primeira disponível (compatibilidade) */
  imagemUrl?: string | null;
  imagemFrenteUrl?: string | null;
  imagemVersoUrl?: string | null;
}

export function aparelhoLabel(a: Pick<AparelhoCatalogo, 'marca' | 'modelo'>): string {
  return `${a.marca} ${a.modelo}`.trim();
}
