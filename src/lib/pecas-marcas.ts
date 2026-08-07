/**
 * Marcas padrão do catálogo de peças.
 * Logos via Simple Icons CDN (https://github.com/simple-icons/simple-icons).
 */
export type PecaMarcaPadrao = {
  nome: string;
  slug: string;
  /** slug no Simple Icons (cdn.simpleicons.org) */
  icon: string;
  /** cor hex sem # para o CDN */
  cor?: string;
  ordem: number;
};

export const PECAS_MARCAS_PADRAO: PecaMarcaPadrao[] = [
  { nome: 'iPhone', slug: 'iphone', icon: 'apple', cor: '111111', ordem: 10 },
  { nome: 'Samsung', slug: 'samsung', icon: 'samsung', cor: '1428A0', ordem: 20 },
  { nome: 'Xiaomi', slug: 'xiaomi', icon: 'xiaomi', cor: 'FF6900', ordem: 30 },
  { nome: 'Motorola', slug: 'motorola', icon: 'motorola', cor: 'E1140A', ordem: 40 },
  { nome: 'LG', slug: 'lg', icon: 'lg', cor: 'A50034', ordem: 50 },
  { nome: 'Huawei', slug: 'huawei', icon: 'huawei', cor: 'CF0A2C', ordem: 60 },
  { nome: 'Asus', slug: 'asus', icon: 'asus', cor: '000000', ordem: 70 },
  { nome: 'Google', slug: 'google', icon: 'google', cor: '4285F4', ordem: 80 },
  { nome: 'Sony', slug: 'sony', icon: 'sony', cor: '000000', ordem: 90 },
  { nome: 'Nokia', slug: 'nokia', icon: 'nokia', cor: '124191', ordem: 100 },
  { nome: 'OnePlus', slug: 'oneplus', icon: 'oneplus', cor: 'F5010C', ordem: 110 },
  { nome: 'Realme', slug: 'realme', icon: 'realme', cor: 'FFC915', ordem: 120 },
  { nome: 'Oppo', slug: 'oppo', icon: 'oppo', cor: '1A531B', ordem: 130 },
  { nome: 'Vivo', slug: 'vivo', icon: 'vivo', cor: '415FFF', ordem: 140 },
];

/** URL do ícone no CDN do Simple Icons. */
export function marcaIconUrl(icon: string, cor = '111111'): string {
  return `https://cdn.simpleicons.org/${encodeURIComponent(icon)}/${cor}`;
}

export function marcaPadraoPorSlug(slug?: string | null, nome?: string | null) {
  const raw = (slug || nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  return (
    PECAS_MARCAS_PADRAO.find((m) => m.slug === raw) ||
    PECAS_MARCAS_PADRAO.find((m) => raw.includes(m.slug) || raw.includes(m.icon)) ||
    (raw.includes('iphone') || raw.includes('apple')
      ? PECAS_MARCAS_PADRAO.find((m) => m.slug === 'iphone')
      : undefined) ||
    (raw.includes('galaxy') ? PECAS_MARCAS_PADRAO.find((m) => m.slug === 'samsung') : undefined) ||
    (raw.includes('moto') ? PECAS_MARCAS_PADRAO.find((m) => m.slug === 'motorola') : undefined) ||
    (raw.includes('redmi') || raw.includes('poco')
      ? PECAS_MARCAS_PADRAO.find((m) => m.slug === 'xiaomi')
      : undefined) ||
    (raw.includes('pixel') ? PECAS_MARCAS_PADRAO.find((m) => m.slug === 'google') : undefined)
  );
}

export function resolveMarcaImagemUrl(opts: {
  slug?: string | null;
  nome?: string | null;
  imagemUrl?: string | null;
}): string | null {
  if (opts.imagemUrl) return opts.imagemUrl;
  const marca = marcaPadraoPorSlug(opts.slug, opts.nome);
  if (!marca) return null;
  return marcaIconUrl(marca.icon, marca.cor);
}
