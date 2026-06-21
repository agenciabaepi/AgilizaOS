export interface ItemCupomNormalizado {
  id: string;
  nome: string;
  preco: number;
  qty: number;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Normaliza itens de venda vindos do JSON `produtos` (PDV, OS, legado). */
export function normalizarItemCupom(item: unknown): ItemCupomNormalizado {
  const raw = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;

  const qty = asNumber(raw.qty ?? raw.qtd ?? raw.quantidade, 1) || 1;
  let preco = asNumber(raw.preco ?? raw.preco_unitario ?? raw.valor_unitario, 0);

  if (preco === 0 && raw.subtotal != null) {
    preco = asNumber(raw.subtotal, 0) / qty;
  }

  const id = String(raw.id ?? raw.produto_id ?? `item-${Math.random().toString(36).slice(2, 9)}`);
  const nome =
    String(raw.nome ?? raw.descricao ?? '').trim() ||
    (raw.produto_id ? `Produto #${String(raw.produto_id).slice(0, 8)}` : 'Item');

  return { id, nome, preco, qty };
}

export function parseProdutosVenda(produtos: unknown): unknown[] {
  if (Array.isArray(produtos)) return produtos;
  if (typeof produtos === 'string') {
    try {
      const parsed = JSON.parse(produtos);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizarItensCupom(itens: unknown): ItemCupomNormalizado[] {
  return parseProdutosVenda(itens).map(normalizarItemCupom);
}

export function formatarMoedaCupom(value: unknown): string {
  return asNumber(value, 0).toFixed(2);
}
