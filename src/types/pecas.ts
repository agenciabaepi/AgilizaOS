export interface PecaGrupoCatalogo {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  icone?: string | null;
  imagem_url?: string | null;
  cor?: string | null;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  /** Contagem de peças ativas com estoque (preenchido na API pública) */
  pecas_count?: number;
  categorias_count?: number;
}

export interface PecaCategoriaCatalogo {
  id: string;
  grupo_id: string;
  nome: string;
  slug: string;
  imagem_url?: string | null;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  grupo?: Pick<PecaGrupoCatalogo, 'id' | 'nome' | 'slug'> | null;
  subcategorias_count?: number;
  pecas_count?: number;
}

export interface PecaSubcategoriaCatalogo {
  id: string;
  categoria_id: string;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  categoria?: Pick<PecaCategoriaCatalogo, 'id' | 'nome' | 'slug' | 'grupo_id'> | null;
  pecas_count?: number;
}

/** Fornecedor / marca da peça (ex.: Soft OLED, JK) — não confundir com marca do aparelho. */
export interface PecaFornecedorCatalogo {
  id: string;
  nome: string;
  slug: string;
  imagem_url?: string | null;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PecaCatalogo {
  id: string;
  grupo_id: string;
  categoria_id?: string | null;
  subcategoria_id?: string | null;
  fornecedor_id?: string | null;
  codigo?: string | null;
  nome: string;
  descricao?: string | null;
  /** Nome do fornecedor (espelho de fornecedor.nome para busca/compat) */
  marca?: string | null;
  modelo_compativel?: string | null;
  preco: number;
  custo?: number | null;
  estoque: number;
  estoque_min: number;
  unidade: string;
  imagem_url?: string | null;
  ativo: boolean;
  destaque: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
  grupo?: Pick<PecaGrupoCatalogo, 'id' | 'nome' | 'slug'> | null;
  categoria?: Pick<PecaCategoriaCatalogo, 'id' | 'nome' | 'slug'> | null;
  subcategoria?: (Pick<PecaSubcategoriaCatalogo, 'id' | 'nome' | 'slug'> & { ordem?: number }) | null;
  fornecedor?: Pick<PecaFornecedorCatalogo, 'id' | 'nome' | 'slug' | 'imagem_url'> | null;
}
