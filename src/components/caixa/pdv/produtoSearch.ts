import { ProdutoPDV } from './types';

export function mapProdutoPDV(p: Record<string, unknown>): ProdutoPDV {
  return {
    id: String(p.id),
    nome: String(p.nome ?? ''),
    preco: Number(p.preco) || 0,
    codigo: p.codigo != null ? String(p.codigo) : undefined,
    codigo_barras: p.codigo_barras != null ? String(p.codigo_barras) : undefined,
    categoria: p.categoria != null ? String(p.categoria) : undefined,
    marca: p.marca != null ? String(p.marca) : undefined,
    estoque_atual: p.estoque_atual != null ? Number(p.estoque_atual) : undefined,
  };
}

export function produtoCombinaTermo(produto: ProdutoPDV, termo: string): boolean {
  const t = termo.toLowerCase().trim();
  if (!t) return false;
  return (
    produto.nome.toLowerCase().includes(t) ||
    produto.codigo?.toLowerCase().includes(t) === true ||
    produto.codigo_barras?.toLowerCase().includes(t) === true ||
    produto.categoria?.toLowerCase().includes(t) === true ||
    produto.marca?.toLowerCase().includes(t) === true
  );
}

export function produtoCombinaExato(produto: ProdutoPDV, termo: string): boolean {
  const t = termo.trim();
  if (!t) return false;
  return (
    produto.codigo === t ||
    produto.codigo_barras === t ||
    produto.nome.toLowerCase() === t.toLowerCase()
  );
}
