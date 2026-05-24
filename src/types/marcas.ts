export interface MarcaCatalogo {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  total_aparelhos?: number;
  created_at?: string;
  updated_at?: string;
}
