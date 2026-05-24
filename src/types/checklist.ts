export interface ChecklistItemBase {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria: string;
  ordem: number;
  obrigatorio: boolean;
  ativo: boolean;
}

export interface ChecklistItemCatalogo extends ChecklistItemBase {
  tipo_id: string;
  equipamento_categoria: string;
  origem?: 'catalogo_global';
}

export const CHECKLIST_CATEGORIAS = [
  { value: 'geral', label: 'Geral' },
  { value: 'audio', label: 'Áudio' },
  { value: 'video', label: 'Vídeo' },
  { value: 'conectividade', label: 'Conectividade' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'energia', label: 'Energia' },
  { value: 'display', label: 'Display' },
] as const;
