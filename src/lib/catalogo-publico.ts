export type CatalogoPublicoEmpresa = {
  id: string;
  nome: string;
  logo_url: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  website: string | null;
};

export type CatalogoPublicoConfig = {
  slug: string;
  titulo: string;
  descricao: string | null;
  whatsapp: string | null;
  cor: string;
};

export type CatalogoPublicoProduto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  categoria: string | null;
  marca: string | null;
  tipo: string | null;
  codigo: string | null;
  imagem_url: string | null;
  imagens?: string[];
};

export type CatalogoCarrinhoItem = {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  imagem_url: string | null;
  codigo: string | null;
};

export type CatalogoPublicoPayload = {
  empresa: CatalogoPublicoEmpresa;
  config: CatalogoPublicoConfig;
  produtos: CatalogoPublicoProduto[];
  categorias: string[];
};

export function slugifyCatalogo(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function formatCatalogoCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(value) ? value : 0
  );
}

/** Normaliza telefone BR e monta link wa.me */
export function formatCatalogoWhatsAppLink(phone: string, message?: string): string {
  let digits = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

export function productImages(imagens: unknown): string[] {
  if (Array.isArray(imagens)) {
    return imagens
      .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      .map((u) => u.trim());
  }
  if (typeof imagens === 'string' && imagens.trim()) {
    try {
      const parsed = JSON.parse(imagens);
      if (Array.isArray(parsed)) return productImages(parsed);
    } catch {
      return [imagens.trim()];
    }
  }
  return [];
}

export function firstProductImage(imagens: unknown): string | null {
  return productImages(imagens)[0] ?? null;
}

type RelNome = { nome?: string | null } | { nome?: string | null }[] | null | undefined;

function relNome(value: RelNome): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  const nome = row?.nome?.trim();
  return nome || null;
}

/** Prioridade: categorias_produtos > grupos_produtos > texto legado `categoria`. */
export function resolveCategoriaProduto(row: {
  categoria?: string | null;
  categorias_produtos?: RelNome;
  grupos_produtos?: RelNome;
}): string | null {
  return (
    relNome(row.categorias_produtos) ||
    relNome(row.grupos_produtos) ||
    (typeof row.categoria === 'string' ? row.categoria.trim() : '') ||
    null
  );
}

export function mapProdutoCatalogo(row: {
  id: string;
  nome: string;
  obs?: string | null;
  preco?: number | null;
  categoria?: string | null;
  marca?: string | null;
  tipo?: string | null;
  codigo?: string | null;
  imagens_url?: unknown;
  categorias_produtos?: RelNome;
  grupos_produtos?: RelNome;
}): CatalogoPublicoProduto {
  const imagens = productImages(row.imagens_url);
  return {
    id: row.id,
    nome: row.nome,
    descricao: typeof row.obs === 'string' ? row.obs : null,
    preco: Number(row.preco) || 0,
    categoria: resolveCategoriaProduto(row),
    marca: row.marca?.trim() || null,
    tipo: row.tipo || null,
    codigo: typeof row.codigo === 'string' && row.codigo.trim() ? row.codigo.trim() : null,
    imagem_url: imagens[0] ?? null,
    imagens,
  };
}

export function buildPedidoWhatsAppMessage(
  tituloLoja: string,
  itens: CatalogoCarrinhoItem[],
  observacao?: string
): string {
  const lines = [
    `Olá! Vim pelo catálogo de *${tituloLoja}* e quero fazer um pedido:`,
    '',
  ];

  let total = 0;
  itens.forEach((item, index) => {
    const subtotal = item.preco * item.quantidade;
    total += subtotal;
    const cod = item.codigo ? ` (${item.codigo})` : '';
    lines.push(
      `${index + 1}. ${item.nome}${cod}`
    );
    lines.push(
      `   ${item.quantidade}x ${formatCatalogoCurrency(item.preco)} = ${formatCatalogoCurrency(subtotal)}`
    );
  });

  lines.push('', `*Total: ${formatCatalogoCurrency(total)}*`);
  if (observacao?.trim()) {
    lines.push('', `Obs.: ${observacao.trim()}`);
  }
  return lines.join('\n');
}
