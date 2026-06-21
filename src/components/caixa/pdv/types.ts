export interface ProdutoPDV {
  id: string;
  nome: string;
  preco: number;
  codigo?: string;
  codigo_barras?: string;
  categoria?: string;
  marca?: string;
  estoque_atual?: number;
}

export interface ItemCarrinho extends ProdutoPDV {
  qty: number;
  desconto: number;
  acrescimo: number;
}

export interface PagamentoAplicado {
  id: string;
  metodo: string;
  valor: number;
}

export interface ClientePDV {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  celular?: string;
  email: string;
  numero_cliente: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
}

export const FORMAS_PAGAMENTO = [
  { id: 'dinheiro', label: 'Dinheiro', shortcut: 'Alt+1' },
  { id: 'pix', label: 'Pix', shortcut: 'Alt+2' },
  { id: 'credito', label: 'Cartão de crédito', shortcut: 'Alt+3' },
  { id: 'debito', label: 'Cartão de débito', shortcut: 'Alt+4' },
] as const;
