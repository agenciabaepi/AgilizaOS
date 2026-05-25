export interface CorCatalogo {
  id: string;
  nome: string;
  hex?: string | null;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AparelhoCatalogoCor {
  id: string;
  aparelho_catalogo_id: string;
  cor_id: string;
  cor_nome?: string;
  cor_hex?: string | null;
  imagem_url?: string | null;
  imagem_frente_url?: string | null;
  imagem_verso_url?: string | null;
  ordem: number;
  ativo: boolean;
}
